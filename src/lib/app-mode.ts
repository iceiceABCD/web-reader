export function isPrivateMode(): boolean {
  return process.env.APP_MODE === "private";
}

export function getAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL || "",
    password: process.env.ADMIN_PASSWORD || "",
  };
}