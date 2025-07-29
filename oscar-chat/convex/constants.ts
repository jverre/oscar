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
    fileExtension: ".blog",
    snapshotId: "im-9Y9bpOgjF7ILC6XNR5kOdy",
    isActive: true
  },
  canvas: {
    name: "canvas",
    fileExtension: ".canvas",
    snapshotId: "im-5hi7Pwd7blAeB83XN0bqmU",
    isActive: true
  },
  xterm: {
    name: "xterm",
    fileExtension: ".sh",
    snapshotId: "im-HTn3jGkBOmgdR8BlmvUrCN",
    isActive: true
  }
};