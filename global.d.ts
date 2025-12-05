// Global type declarations for Chrome Extension APIs
declare namespace chrome {
  export namespace runtime {
    export function sendMessage(message: any): void;
    export function openOptionsPage(): void;
    export const onMessage: {
      addListener(callback: (request: any) => void): void;
      removeListener(callback: (request: any) => void): void;
    };
    export const lastError: { message: string } | undefined;
  }

  export namespace tabs {
    export interface Tab {
      id?: number;
      url?: string;
      active?: boolean;
    }
    export function query(
      queryInfo: { active?: boolean; currentWindow?: boolean },
      callback: (tabs: Tab[]) => void
    ): void;
  }

  export namespace scripting {
    export interface InjectionResult {
      result?: any;
    }
    export function executeScript(
      injection: {
        target: { tabId: number };
        func: () => any;
      },
      callback?: (results: InjectionResult[]) => void
    ): void;
  }

  export namespace storage {
    export namespace local {
      export function get(
        keys: string[],
        callback: (result: { [key: string]: any }) => void
      ): void;
      export function set(
        items: { [key: string]: any },
        callback?: () => void
      ): void;
    }
    export const onChanged: {
      addListener(
        callback: (
          changes: { [key: string]: any },
          namespace: string
        ) => void
      ): void;
    };
  }
}
