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
import type * as conversations from "../conversations.js";
import type * as featureBranches from "../featureBranches.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as repositories from "../repositories.js";
import type * as sandbox from "../sandbox.js";
import type * as uploadMessages from "../uploadMessages.js";
import type * as user from "../user.js";

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
  conversations: typeof conversations;
  featureBranches: typeof featureBranches;
  http: typeof http;
  messages: typeof messages;
  repositories: typeof repositories;
  sandbox: typeof sandbox;
  uploadMessages: typeof uploadMessages;
  user: typeof user;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
