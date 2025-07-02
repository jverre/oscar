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
import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as blogs from "../blogs.js";
import type * as files from "../files.js";
import type * as flyApi from "../flyApi.js";
import type * as flyMachines from "../flyMachines.js";
import type * as gitFiles from "../gitFiles.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as organizations from "../organizations.js";
import type * as search from "../search.js";
import type * as teams from "../teams.js";
import type * as timeline from "../timeline.js";
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
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  blogs: typeof blogs;
  files: typeof files;
  flyApi: typeof flyApi;
  flyMachines: typeof flyMachines;
  gitFiles: typeof gitFiles;
  http: typeof http;
  messages: typeof messages;
  organizations: typeof organizations;
  search: typeof search;
  teams: typeof teams;
  timeline: typeof timeline;
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
