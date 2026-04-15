export type BrowserLaunchEnvironment = {
  headless: boolean;
  display?: string;
  platform: NodeJS.Platform | string;
};

export function getBrowserLaunchProblem(environment: BrowserLaunchEnvironment): string | null {
  if (environment.headless) {
    return null;
  }
  if (environment.platform !== "linux") {
    return null;
  }
  if (environment.display) {
    return null;
  }

  return [
    "Khong the mo Chrome co giao dien tren Linux server vi khong co DISPLAY.",
    "Cach chay prototype hien tai can mot browser co giao dien de login va mo group Zalo.",
    "Hay chay tren may co GUI, hoac dung remote desktop/VNC, hoac chay qua xvfb-run neu da co session Zalo va khong can thao tac tay."
  ].join(" ");
}
