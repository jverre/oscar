/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as authAdapter from "../authAdapter.js";
import type * as authUtils from "../authUtils.js";
import type * as chats from "../chats.js";
import type * as constants from "../constants.js";
import type * as fileMessages from "../fileMessages.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as plugins from "../plugins.js";
import type * as sandboxes from "../sandboxes.js";
import type * as tools_bash from "../tools/bash.js";
import type * as tools_bash_description from "../tools/bash_description.js";
import type * as tools_edit from "../tools/edit.js";
import type * as tools_edit_description from "../tools/edit_description.js";
import type * as tools_fileSystem from "../tools/fileSystem.js";
import type * as tools_index from "../tools/index.js";
import type * as tools_ls from "../tools/ls.js";
import type * as tools_ls_description from "../tools/ls_description.js";
import type * as tools_read from "../tools/read.js";
import type * as tools_read_description from "../tools/read_description.js";
import type * as tools_snapshots from "../tools/snapshots.js";
import type * as tools_system_prompt from "../tools/system_prompt.js";
import type * as tools_utils from "../tools/utils.js";
import type * as tools_webfetch from "../tools/webfetch.js";
import type * as tools_webfetch_description from "../tools/webfetch_description.js";
import type * as tools_write from "../tools/write.js";
import type * as tools_write_description from "../tools/write_description.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authAdapter: typeof authAdapter;
  authUtils: typeof authUtils;
  chats: typeof chats;
  constants: typeof constants;
  fileMessages: typeof fileMessages;
  files: typeof files;
  http: typeof http;
  plugins: typeof plugins;
  sandboxes: typeof sandboxes;
  "tools/bash": typeof tools_bash;
  "tools/bash_description": typeof tools_bash_description;
  "tools/edit": typeof tools_edit;
  "tools/edit_description": typeof tools_edit_description;
  "tools/fileSystem": typeof tools_fileSystem;
  "tools/index": typeof tools_index;
  "tools/ls": typeof tools_ls;
  "tools/ls_description": typeof tools_ls_description;
  "tools/read": typeof tools_read;
  "tools/read_description": typeof tools_read_description;
  "tools/snapshots": typeof tools_snapshots;
  "tools/system_prompt": typeof tools_system_prompt;
  "tools/utils": typeof tools_utils;
  "tools/webfetch": typeof tools_webfetch;
  "tools/webfetch_description": typeof tools_webfetch_description;
  "tools/write": typeof tools_write;
  "tools/write_description": typeof tools_write_description;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
