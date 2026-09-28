// Better Auth's captcha plugin reads the Turnstile token from this header.
export function captchaHeaders(form: HTMLFormElement): Record<string, string> {
  const token = form.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value ?? '';
  return { 'x-captcha-response': token };
}

// Each token works once, so a failed attempt needs a fresh challenge.
export function resetCaptcha(): void {
  (window as unknown as { turnstile?: { reset(): void } }).turnstile?.reset();
}
