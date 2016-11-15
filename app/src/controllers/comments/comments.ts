import { Component, EventEmitter, Renderer, ViewChild, ElementRef } from '@angular/core';

import { Client } from '../../services/api';
import { SessionFactory } from '../../services/session';
import { SignupModalService } from '../../components/modal/signup/service';

import { AttachmentService } from '../../services/attachment';
import { SocketsService } from '../../services/sockets';

@Component({
  moduleId: module.id,
  selector: 'minds-comments',
  inputs: ['_object : object', '_reversed : reversed', 'limit', 'focusOnInit'],
  templateUrl: 'list.html'
})

export class Comments {

  minds;
  object;
  guid: string = "";
  parent: any;
  comments : Array<any> = [];
  content = '';
  reversed : boolean = false;
  session = SessionFactory.build();

  focusOnInit: boolean = false;
  @ViewChild('message') composerTextarea: ElementRef;

  editing : boolean = false;

  showModal : boolean = false;

  limit : number = 5;
  offset : string = "";
  inProgress : boolean = false;
  canPost: boolean = true;
  triedToPost: boolean = false;
  moreData: boolean = false;
  loaded: boolean = false;

  socketRoomName: string;
  socketSubscriptions: any = {
    comment: null
  };

  commentsScrollEmitter: EventEmitter<any> = new EventEmitter();

  constructor(public client: Client, public attachment: AttachmentService, private modal: SignupModalService, public sockets: SocketsService, private renderer: Renderer) {
    this.minds = window.Minds;
	}

  set _object(value: any) {
    this.object = value;
    this.guid = this.object.guid;
    if(this.object.entity_guid)
      this.guid = this.object.entity_guid;
    this.parent = this.object;
    this.load(true);
    this.listen();
  }

  set _reversed(value: boolean){
    if(value)
      this.reversed = true;
    else
      this.reversed = false;
  }

  load(refresh = false) {
    if (this.inProgress) {
      return;
    }

    this.inProgress = true;

    this.client.get('api/v1/comments/' + this.guid, { limit: this.limit, offset: this.offset, reversed: true })
      .then((response : any) => {

        if (!this.socketRoomName && response.socketRoomName) {
          this.socketRoomName = response.socketRoomName;
          this.joinSocketRoom();
        }

        this.loaded = true;
        this.inProgress = false;
        this.moreData = true;

        if(!response.comments){
          this.moreData = false;
          return false;
        }

        this.comments = response.comments.concat(this.comments);

        this.offset = response['load-previous'];

        if (refresh) {
          this.commentsScrollEmitter.emit('bottom');
        }
        
        if (
          !this.offset ||
          this.offset == null ||
          response.comments.length < (this.limit - 1)
        ) {
          this.moreData = false;
        }
      })
      .catch((e) => {
        this.inProgress = false;
      });
  }

  private autoloadBlocked = false;
  autoloadPrevious() {
    if (!this.moreData || this.autoloadBlocked) {
      return;
    }

    this.cancelOverscroll();

    this.autoloadBlocked = true;
    setTimeout(() => {
      this.autoloadBlocked = false;
    }, 1000);

    this.load();
  }

  private overscrollTimer;
  private overscrollAmount = 0;
  overscrollHandler({ deltaY }) {
    this.cancelOverscroll();

    if (this.autoloadBlocked) {
      this.overscrollAmount = 0;
      return;
    }

    this.overscrollAmount += deltaY;

    this.overscrollTimer = setTimeout(() => {
      if (this.overscrollAmount < -75) { //75px
        this.autoloadPrevious();
      }

      this.overscrollAmount = 0;
    }, 250); // in 250ms
  }

  cancelOverscroll() {
    if (this.overscrollTimer) {
      clearTimeout(this.overscrollTimer);
    }
  }

  joinSocketRoom() {
    if (this.socketRoomName) {
      this.sockets.join(this.socketRoomName);
    }
  }

  ngAfterViewInit() {
    if (this.focusOnInit) {
      this.renderer.invokeElementMethod(this.composerTextarea.nativeElement, 'focus');
    }
  }

  ngOnDestroy() {
    this.cancelOverscroll();

    if (this.socketRoomName) {
      this.sockets.leave(this.socketRoomName);
    }
  }

  listen() {
    this.socketSubscriptions.comment = this.sockets.subscribe('comment', (parent_guid, owner_guid, guid) => {
      if (parent_guid !== this.guid) {
        return;
      }

      if (this.session.isLoggedIn() && owner_guid === this.session.getLoggedInUser().guid) {
        return;
      }

      this.client.get('api/v1/comments/' + this.guid, { limit: 1, offset: guid, reversed: false })
        .then((response: any) => {
          if (!response.comments || response.comments.length === 0) {
            return;
          }

          this.comments.push(response.comments[0]);
          this.commentsScrollEmitter.emit('bottom');
        })
        .catch(e => {});
    });
  }

  postEnabled() {
    return !this.inProgress && this.canPost && (this.content || this.attachment.has());
  }

  post(e){
    e.preventDefault();

    if (!this.content && !this.attachment.has()) {
      return;
    }

    if (this.inProgress || !this.canPost) {
      this.triedToPost = true;
      return;
    }

    let data = this.attachment.exportMeta();
    data['comment'] = this.content;

    this.inProgress = true;
    this.client.post('api/v1/comments/' + this.guid, data)
    .then((response : any) => {
      this.attachment.reset();
      this.content = '';
      this.comments.push(response.comment);
      this.commentsScrollEmitter.emit('bottom');
      this.inProgress = false;
    })
    .catch((e) => {
      this.inProgress = false;
    });
  }

  isLoggedIn(){
    if(!this.session.isLoggedIn()){
      this.modal.setSubtitle("You need to have channel in order to comment").open();
    }
  }


  delete(index : number){
    this.comments.splice(index, 1);
  }

  edited(index: number, $event) {
    this.comments[index] = $event.comment;
  }

  uploadAttachment(file: HTMLInputElement, e?: any) {
    this.canPost = false;
    this.triedToPost = false;

    this.attachment.upload(file)
    .then(guid => {
      this.canPost = true;
      this.triedToPost = false;
      file.value = null;
    })
    .catch(e => {
      console.error(e);
      this.canPost = true;
      this.triedToPost = false;
      file.value = null;
    });
  }

  removeAttachment(file: HTMLInputElement) {
    this.canPost = false;
    this.triedToPost = false;

    this.attachment.remove(file).then(() => {
      this.canPost = true;
      this.triedToPost = false;
      file.value = "";
    }).catch(e => {
      console.error(e);
      this.canPost = true;
      this.triedToPost = false;
    });
  }

  getPostPreview(message){
    if (!message.value) {
      return;
    }

    this.attachment.preview(message.value);
  }

}
