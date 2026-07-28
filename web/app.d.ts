// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App { //note: no effect in vscode
    interface Error {
      message: string;
    }
    interface Locals {}
    interface PageData {}
    interface PageState {
      sessionId: string | null;
    }
    interface Platform {}
  }
}

export {};
