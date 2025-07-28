export const RESERVED_SUBDOMAINS = [
  "www", "app", "api", "admin", "dashboard", "blog",
  "docs", "help", "support", "status", "about", "auth",
  "signin", "signup", "login", "register", "account"
];

export const SUBDOMAIN_REGEX = /^[a-z0-9-]{3,32}$/;

// Global marketplace plugins - automatically updated by create_snapshots.py
export const MARKETPLACE_PLUGINS = {
  blog: {
    name: "blog",
    fileExtension: ".md",
    snapshotId: "im-u6wwP8eRV6b0dvhLK81ihQ",
    isActive: true
  },
  canvas: {
    name: "canvas",
    fileExtension: ".canvas",
    snapshotId: "im-Mn9VtH8UoORDiLExz9Oee8",
    isActive: true
  },
  xterm: {
    name: "xterm",
    fileExtension: ".sh",
    snapshotId: "im-GQMURnEry0tFntTu4AhqXA",
    isActive: true
  }
};