import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No cache store: every search is rendered when it is asked for, so there is nothing to keep.
export default defineCloudflareConfig();
