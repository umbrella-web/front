import { NgModule, enableProdMode, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule } from '@angular/router';

import { Embed } from './embed.component';

import { MindsEmbedRoutes, MindsEmbedRoutingProviders, MINDS_EMBED_ROUTING_DECLARATIONS } from './src/router/embed';
import { MINDS_APP_ROUTING_DECLARATIONS } from './src/router/app';

import { MINDS_DECLARATIONS } from './src/declarations';
import { MINDS_PLUGIN_DECLARATIONS } from './src/plugin-declarations';
import { MINDS_PROVIDERS } from './src/services/providers';
import { MINDS_PLUGIN_PROVIDERS } from './src/plugin-providers';

@NgModule({
  bootstrap: [
    Embed
  ],
  declarations: [
    Embed,
    MINDS_APP_ROUTING_DECLARATIONS,
    MINDS_EMBED_ROUTING_DECLARATIONS,
    MINDS_DECLARATIONS,
    MINDS_PLUGIN_DECLARATIONS,
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(MindsEmbedRoutes, { initialNavigation: false, useHash: true }),
  ],
  providers: [
    MindsEmbedRoutingProviders,
    MINDS_PROVIDERS,
    MINDS_PLUGIN_PROVIDERS,
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class EmbedModule {
}
