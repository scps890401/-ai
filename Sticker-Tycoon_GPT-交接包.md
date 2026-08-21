# Sticker Tycoon — GPT 交接包

**建立日期：** 2026-08-21（GMT+8）  
**專案名稱：** `sticker-tycoon-replica`  
**技術架構：** React 19、Tailwind CSS 4、Express、tRPC 11、Drizzle ORM、MySQL、S3 儲存與 Manus Forge AI API。  
**目前交接版本：** `a906179f`  
**開發預覽：** https://3000-iz5lyb6f797w3r9mx3q52-1bd1a3b4.sg1.manus.computer

> 本文件是可直接交給 GPT 的單一 Markdown 交接檔，包含需求脈絡、現況、已知限制、驗證結果與可分享的專案原始碼。已刻意排除 `.env`、密鑰、使用者上傳原圖、二進位圖像、`node_modules`、建置產物與平台內部紀錄。

## 1. 專案目標

將「貼圖大亨 Sticker Tycoon」重建為**完全在網頁內完成**的 AI 貼圖製作工作室。使用者可上傳多張角色照片（含 iPhone HEIC）、以文字規劃角色與貼圖腳本、批次生成透明背景 PNG、逐張品質檢查及排序、使用聊天修改單張結果，最後下載 PNG 或 ZIP。專案以 `projectKey` 支援跨裝置恢復。

## 2. 目前功能與狀態

| 功能 | 實作狀態 | 備註 |
| --- | --- | --- |
| 免費、無付款與外部 LINE 導流 | 已完成 | 所有製作流程均留在網站內。 |
| HEIC／HEIF 多照片上傳 | 已完成 | 瀏覽器端先用 `heic2any` 轉 JPEG；單檔上限 12 MB、逐張錯誤訊息、最多 10 張。 |
| AI 專案規劃與可編輯備援腳本 | 已完成 | LLM 額度耗盡時自動建立可編輯的本地腳本。 |
| AI 批次貼圖生成與角色一致性 | 已完成 | 使用多參考圖、逐張狀態與失敗重試。 |
| 透明背景／品質檢查 | 已完成 | 驗證 PNG alpha、尺寸與文字腳本狀態。 |
| 聊天式單張修改 | 已完成 | AI 可用時建立新圖；額度耗盡時不覆蓋原圖並給出友善提示。 |
| 排序、單張下載、ZIP 匯出 | 已完成 | 排序後 ZIP 內編號與檔名同步。 |
| 專案續作 | 已完成 | localStorage + 伺服器持久化，輸入 `projectKey` 可恢復。 |

### 2.1 已知服務狀態與實測結果

AI 圖像／規劃服務在最後一次驗證時回傳 `412 usage exhausted`。網站已將此狀況當成可恢復的服務限制處理，而非空白圖或未處理錯誤。使用提供的 10 張 HEIC 進行批次實測時，**5 張成功生成透明 PNG，5 張因 AI 使用量限制標記為待重試**；不可將此表述為 10 張都成功。

### 2.2 關鍵修正：HEIC

原先的 iPhone HEIC 圖片在伺服器端解碼會受到 `libheif` 安全限制影響。修正方式是前端辨識 HEIC／HEIF，動態載入 `heic2any`，在使用者裝置內轉成 JPEG 後才上傳。此方式同時降低伺服器端解碼風險，並保留多檔上傳工作流。

## 4. 架構與關鍵檔案

| 區域 | 重點檔案 | 用途 |
| --- | --- | --- |
| 前端工作室 | `client/src/pages/Home.tsx` | 四步驟精靈、HEIC 轉檔、上傳、批次結果、排序、ZIP、聊天修改與 projectKey。 |
| 視覺系統 | `client/src/index.css` | 深海藍科技視覺、響應式工作室與結果卡片。 |
| tRPC 路由 | `server/routers.ts` | 規劃、專案、參考圖、生成、去背、修改、品質檢查、ZIP。 |
| 資料庫 | `server/db.ts`、`drizzle/schema.ts` | 專案、參考照片、腳本、版本與生成狀態持久化。 |
| AI | `server/_core/imageGeneration.ts`、`server/_core/llm.ts` | 圖像生成、透明背景驗證、LLM 呼叫與 412 退避策略。 |
| 驗證 | `server/creative.test.ts`、`scripts/verify-browser-*.mjs` | 單元測試及 Chromium 手機／結果流程回歸。 |

## 5. 已完成驗證

| 驗證項目 | 結果 |
| --- | --- |
| TypeScript：`pnpm check` | 通過。 |
| Vitest：`pnpm test` | 2 個測試檔、5 項測試全數通過。 |
| Production build：`pnpm build` | 通過。 |
| HEIC 瀏覽器回歸 | 5 張 HEIC 多檔上傳、過大檔案提示、腳本排序、失敗防呆、projectKey 續作均通過。 |
| 成功貼圖 ZIP 瀏覽器回歸 | 通過：排序後 `謝謝` 在 ZIP 中為 `sticker-01-謝謝.png`，其後依序為 `早安`、`收到`、`加油`。 |
| AI 修改額度耗盡 | 通過：原始圖片 URL 保持不變、顯示額度提示，瀏覽器 console 無錯誤。 |

## 6. 給 GPT 的後續協作注意事項

1. 不要將付款、LINE 導流或外部購買入口加回網站；產品要求為完全免費且操作留在網站內。
2. 不要把 HEIC 解碼改回伺服器端流程；須維持瀏覽器端 `heic2any` 轉 JPEG。
3. AI 服務可能暫時回傳 `412 usage exhausted`。所有生成、規劃與修改流程應保持可理解的備援與重試入口，不能覆蓋成功結果或呈現空白。
4. 不得在任何地方偽造評價、星等或使用者見證。
5. 不要提交 `.env`、API Token、使用者原始照片或二進位生成圖片；S3 路徑與程式碼足以說明資料流。



## 3. 可見對話與需求歷程

> 此章節是依本工作階段可見的使用者訊息與交接摘要重建，不包含平台內部指令、密鑰、隱藏系統內容或未提供給本工作階段的逐字紀錄。

| 階段 | 使用者需求或回饋 | 對應處置 |
| --- | --- | --- |
| 初始重建 | 提供參考網站並要求建立相同的網站與功能。 | 重建深色科技風落地頁與貼圖製作體驗。 |
| 免費化 | 要求移除所有付費內容。 | 移除價格、付款、購買、升級、點數與銷售導流。 |
| 網頁內流程 | 詢問為何連結 LINE，並要求所有操作留在網站內。 | 移除全部 LINE 外部連結，改為網頁內上傳、生成與下載。 |
| 介面簡化 | 多次要求刪除指定區域，讓首頁更簡潔。 | 精簡英雄區與頁尾，移除 FAQ、外部導流與多餘資訊。 |
| 能力擴充 | 要求加入 AI 語意去背、多輪聊天修改、真正 AI 生成。 | 導入 AI 圖像生成、透明背景處理、對話式修改。 |
| 工作流升級 | 要求加入 ZIP、品質檢查、角色一致性、多照片、腳本、專案精靈與續作。 | 建立四步驟專案精靈、持久化專案、批次生成、排序、ZIP 與 projectKey 恢復。 |
| HEIC 錯誤 | 上傳 iPhone HEIC 照片後出錯，要求找原因並檢查所有流程。 | 發現伺服器端 libheif 的安全限制，改為瀏覽器端 heic2any 轉 JPEG，再安全上傳；加入 12 MB 限制與逐張錯誤訊息。 |
| 最終驗證 | 需要確認 ZIP 與聊天修改失敗流程。 | 驗證排序後 ZIP 下載及檔名，AI 額度耗盡時保留原圖與一致提示。 |

### 3.1 可見使用者原話

1. `https://sticker-tycoon.netlify.app/?utm_source=chatgpt.com 製作一個一模一樣的網頁，功能也要一模一樣。`
2. `接下來要開始整改網頁，首先這個網頁是免費的，所有要付費的都幫我刪除。`
3. `我想詢問為什麼要連結到line`
4. `幫我重新設計網頁的首頁按鈕與操作流程，讓整個貼圖製作過程完全在網頁內完成。請把所有 LINE 連結移除，改為讓使用者可以直接在網頁內上傳照片並生成貼圖。`
5. `這裡去除，讓網頁更簡潔。`（多次，針對圈選區域）
6. `仔細閱讀每一天訊息，每一個功能，並羅列所有功能出來，看看有沒有能夠加入我們網頁的。`
7. `按照你盤點出來的內容，在網頁加入這幾個功能，AI 語意去背／多輪聊天修改／真正 AI 生成。`
8. `我要讓我們網頁的 ai 能夠如同我給你的這個連結一樣強大的製作貼圖能力。先回答我能夠做到嗎？會加入什麼功能，再來進行加入。`
9. `先將你所說的這些能力加入網頁，ZIP 匯出／對話式修改／品質檢查／透明背景／獨立貼圖生成／角色一致性／文字與情境設計／貼圖張數選擇／角色設定檔／多張角色照片上傳／需求對話與方案規劃／專案精靈，然後將你這個 ai 所擁有的功能與能力也加入到網頁的 ai 裡面。上面所說做完之後我想先看目前網頁更新後的樣子，請直接把程式碼與介面更新完成。並用我給你的 10 照片嘗試運轉網頁生成出 10 張卡通貼圖來，如果失敗找出原因並修正。`
10. `我按照步驟放入這幾張照片，卻出現錯誤，找到原因並修正，偵測整個網頁所有流程是否存在 bug，如果有就修正。`

## 7. 可分享原始碼與設定

本章共收錄 135 個文字型專案檔案。依賴、建置產物、密鑰、使用者照片與二進位圖像均已排除。

### `browser-success-result-flow.json`

````json
{
  "ok": true,
  "firstPhrase": "早安",
  "secondPhrase": "謝謝",
  "reorderedFirstPhrase": "謝謝",
  "zipPath": "/tmp/sticker-ui-export.zip",
  "suggestedFilename": "sticker-tycoon-pack.zip",
  "consoleErrors": []
}
````

### `client/index.html`

````html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <meta name="theme-color" content="#071426" />
    <meta name="description" content="貼圖大亨 Sticker Tycoon：用 AI 創造專屬 LINE 貼圖，三分鐘完成。" />
    <title>貼圖大亨 Sticker Tycoon｜AI 智能創作 LINE 貼圖</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script defer src="%VITE_ANALYTICS_ENDPOINT%/umami" data-website-id="%VITE_ANALYTICS_WEBSITE_ID%"></script>
  </body>
</html>

````

### `client/src/_core/hooks/useAuth.ts`

````typescript
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  // Login is started via startLogin() in the effect below, only when we actually
  // navigate — never during render. startLogin() mints a one-time nonce + writes
  // the state cookie, so calling it per render would overwrite the cookie and
  // desync it from an in-flight login's `state`.
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      // Clear the Preview auto-login token mirrored into sessionStorage, so
      // header-based sessions (Safari ITP / WebView) are logged out too. The
      // backend cookie is cleared by the logout mutation.
      try {
        sessionStorage.removeItem("manus-cookie");
      } catch {}
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    // Navigate at this moment only. startLogin() mints the nonce + cookie itself.
    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      startLogin();
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}

````

### `client/src/App.tsx`

````tsx
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

````

### `client/src/components/AIChatBox.tsx`

````tsx
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

/**
 * Message type matching server-side LLM Message interface
 */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIChatBoxProps = {
  /**
   * Messages array to display in the chat.
   * Should match the format used by invokeLLM on the server.
   */
  messages: Message[];

  /**
   * Callback when user sends a message.
   * Typically you'll call a tRPC mutation here to invoke the LLM.
   */
  onSendMessage: (content: string) => void;

  /**
   * Whether the AI is currently generating a response
   */
  isLoading?: boolean;

  /**
   * Placeholder text for the input field
   */
  placeholder?: string;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Height of the chat box (default: 600px)
   */
  height?: string | number;

  /**
   * Empty state message to display when no messages
   */
  emptyStateMessage?: string;

  /**
   * Suggested prompts to display in empty state
   * Click to send directly
   */
  suggestedPrompts?: string[];
};

/**
 * A ready-to-use AI chat box component that integrates with the LLM system.
 *
 * Features:
 * - Matches server-side Message interface for seamless integration
 * - Markdown rendering with Streamdown
 * - Auto-scrolls to latest message
 * - Loading states
 * - Uses global theme colors from index.css
 *
 * @example
 * ```tsx
 * const ChatPage = () => {
 *   const [messages, setMessages] = useState<Message[]>([
 *     { role: "system", content: "You are a helpful assistant." }
 *   ]);
 *
 *   const chatMutation = trpc.ai.chat.useMutation({
 *     onSuccess: (response) => {
 *       // Assuming your tRPC endpoint returns the AI response as a string
 *       setMessages(prev => [...prev, {
 *         role: "assistant",
 *         content: response
 *       }]);
 *     },
 *     onError: (error) => {
 *       console.error("Chat error:", error);
 *       // Optionally show error message to user
 *     }
 *   });
 *
 *   const handleSend = (content: string) => {
 *     const newMessages = [...messages, { role: "user", content }];
 *     setMessages(newMessages);
 *     chatMutation.mutate({ messages: newMessages });
 *   };
 *
 *   return (
 *     <AIChatBox
 *       messages={messages}
 *       onSendMessage={handleSend}
 *       isLoading={chatMutation.isPending}
 *       suggestedPrompts={[
 *         "Explain quantum computing",
 *         "Write a hello world in Python"
 *       ]}
 *     />
 *   );
 * };
 * ```
 */
export function AIChatBox({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  className,
  height = "600px",
  emptyStateMessage = "Start a conversation with AI",
  suggestedPrompts,
}: AIChatBoxProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter out system messages
  const displayMessages = messages.filter((msg) => msg.role !== "system");

  // Calculate min-height for last assistant message to push user message to top
  const [minHeightForLastMessage, setMinHeightForLastMessage] = useState(0);

  useEffect(() => {
    if (containerRef.current && inputAreaRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const inputHeight = inputAreaRef.current.offsetHeight;
      const scrollAreaHeight = containerHeight - inputHeight;

      // Reserve space for:
      // - padding (p-4 = 32px top+bottom)
      // - user message: 40px (item height) + 16px (margin-top from space-y-4) = 56px
      // Note: margin-bottom is not counted because it naturally pushes the assistant message down
      const userMessageReservedHeight = 56;
      const calculatedHeight = scrollAreaHeight - 32 - userMessageReservedHeight;

      setMinHeightForLastMessage(Math.max(0, calculatedHeight));
    }
  }, []);

  // Scroll to bottom helper function with smooth animation
  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement;

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    onSendMessage(trimmedInput);
    setInput("");

    // Scroll immediately after sending
    scrollToBottom();

    // Keep focus on input
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col bg-card text-card-foreground rounded-lg border shadow-sm",
        className
      )}
      style={{ height }}
    >
      {/* Messages Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
        {displayMessages.length === 0 ? (
          <div className="flex h-full flex-col p-4">
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="size-12 opacity-20" />
                <p className="text-sm">{emptyStateMessage}</p>
              </div>

              {suggestedPrompts && suggestedPrompts.length > 0 && (
                <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => onSendMessage(prompt)}
                      disabled={isLoading}
                      className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col space-y-4 p-4">
              {displayMessages.map((message, index) => {
                // Apply min-height to last message only if NOT loading (when loading, the loading indicator gets it)
                const isLastMessage = index === displayMessages.length - 1;
                const shouldApplyMinHeight =
                  isLastMessage && !isLoading && minHeightForLastMessage > 0;

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === "user"
                        ? "justify-end items-start"
                        : "justify-start items-start"
                    )}
                    style={
                      shouldApplyMinHeight
                        ? { minHeight: `${minHeightForLastMessage}px` }
                        : undefined
                    }
                  >
                    {message.role === "assistant" && (
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="size-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2.5",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Streamdown>{message.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-secondary flex items-center justify-center">
                        <User className="size-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div
                  className="flex items-start gap-3"
                  style={
                    minHeightForLastMessage > 0
                      ? { minHeight: `${minHeightForLastMessage}px` }
                      : undefined
                  }
                >
                  <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-2.5">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input Area */}
      <form
        ref={inputAreaRef}
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t bg-background/50 items-end"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 max-h-32 resize-none min-h-9"
          rows={1}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className="shrink-0 h-[38px] w-[38px]"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

````

### `client/src/components/DashboardLayout.tsx`

````tsx
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Page 1", path: "/" },
  { icon: Users, label: "Page 2", path: "/some-path" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    Navigation
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}

````

### `client/src/components/DashboardLayoutSkeleton.tsx`

````tsx
import { Skeleton } from './ui/skeleton';

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="w-[280px] border-r border-border bg-background p-4 space-y-6">
        {/* Logo area */}
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Menu items */}
        <div className="space-y-2 px-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* User profile area at bottom */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {/* Content blocks */}
        <Skeleton className="h-12 w-48 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

````

### `client/src/components/ErrorBoundary.tsx`

````tsx
import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">An unexpected error occurred.</h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

````

### `client/src/components/ManusDialog.tsx`

````tsx
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function ManusDialog({
  title,
  logo,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: ManusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    if (!onOpenChange) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog
      open={onOpenChange ? open : internalOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="py-5 bg-[#f8f8f7] rounded-[20px] w-[400px] shadow-[0px_4px_11px_0px_rgba(0,0,0,0.08)] border border-[rgba(0,0,0,0.08)] backdrop-blur-2xl p-0 gap-0 text-center">
        <div className="flex flex-col items-center gap-2 p-5 pt-12">
          {logo ? (
            <div className="w-16 h-16 bg-white rounded-xl border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
              <img
                src={logo}
                alt="Dialog graphic"
                className="w-10 h-10 rounded-md"
              />
            </div>
          ) : null}

          {/* Title and subtitle */}
          {title ? (
            <DialogTitle className="text-xl font-semibold text-[#34322d] leading-[26px] tracking-[-0.44px]">
              {title}
            </DialogTitle>
          ) : null}
          <DialogDescription className="text-sm text-[#858481] leading-5 tracking-[-0.154px]">
            Please login with Manus to continue
          </DialogDescription>
        </div>

        <DialogFooter className="px-5 py-5">
          {/* Login button */}
          <Button
            onClick={onLogin}
            className="w-full h-10 bg-[#1a1a19] hover:bg-[#1a1a19]/90 text-white rounded-[10px] text-sm font-medium leading-5 tracking-[-0.154px]"
          >
            Login with Manus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

````

### `client/src/components/Map.tsx`

````tsx
/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

function loadMapScript() {
  return new Promise(resolve => {
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      resolve(null);
      script.remove(); // Clean up immediately
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
    };
    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);

  const init = usePersistFn(async () => {
    await loadMapScript();
    if (!mapContainer.current) {
      console.error("Map container not found");
      return;
    }
    map.current = new window.google.maps.Map(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: true,
      mapId: "DEMO_MAP_ID",
    });
    if (onMapReady) {
      onMapReady(map.current);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}

````

### `client/src/components/ui/accordion.tsx`

````tsx
import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };

````

### `client/src/components/ui/alert-dialog.tsx`

````tsx
import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants(), className)}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};

````

### `client/src/components/ui/alert.tsx`

````tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };

````

### `client/src/components/ui/aspect-ratio.tsx`

````tsx
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };

````

### `client/src/components/ui/avatar.tsx`

````tsx
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };

````

### `client/src/components/ui/badge.tsx`

````tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

````

### `client/src/components/ui/breadcrumb.tsx`

````tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn("hover:text-foreground transition-colors", className)}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};

````

### `client/src/components/ui/button-group.tsx`

````tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const buttonGroupVariants = cva(
  "flex w-fit items-stretch [&>*]:focus-visible:z-10 [&>*]:focus-visible:relative [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md has-[>[data-slot=button-group]]:gap-2",
  {
    variants: {
      orientation: {
        horizontal:
          "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical:
          "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
);

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      className={cn(
        "bg-muted flex items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto",
        className
      )}
      {...props}
    />
  );
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
};

````

### `client/src/components/ui/button.tsx`

````tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-transparent shadow-xs hover:bg-accent dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

````

### `client/src/components/ui/calendar.tsx`

````tsx
import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: date =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute bg-popover inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-(--cell-size)",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };

````

### `client/src/components/ui/card.tsx`

````tsx
import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

````

### `client/src/components/ui/carousel.tsx`

````tsx
import * as React from "react";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext]
  );

  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api?.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  );
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel();

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  );
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        "absolute size-8 rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -left-12 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "absolute size-8 rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -right-12 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight />
      <span className="sr-only">Next slide</span>
    </Button>
  );
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
};

````

### `client/src/components/ui/chart.tsx`

````tsx
import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  }) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string"
        ? config[label as keyof typeof config]?.label || label
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter(item => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || item.payload.fill || item.color;

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> &
  Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
    hideIcon?: boolean;
    nameKey?: string;
  }) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload
        .filter(item => item.type !== "none")
        .map(item => {
          const key = `${nameKey || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={item.value}
              className={cn(
                "[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string;
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};

````

### `client/src/components/ui/checkbox.tsx`

````tsx
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };

````

### `client/src/components/ui/collapsible.tsx`

````tsx
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };

````

### `client/src/components/ui/command.tsx`

````tsx
"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
        className
      )}
      {...props}
    />
  );
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn("overflow-hidden p-0", className)}
        showCloseButton={showCloseButton}
      >
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-9 items-center gap-2 border-b px-3"
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className
      )}
      {...props}
    />
  );
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        className
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  );
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};

````

### `client/src/components/ui/context-menu.tsx`

````tsx
import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function ContextMenu({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return (
    <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
  );
}

function ContextMenuGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  );
}

function ContextMenuPortal({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
  );
}

function ContextMenuSub({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

function ContextMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  );
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
        className
      )}
      {...props}
    />
  );
}

function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        "text-foreground px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  );
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};

````

### `client/src/components/ui/dialog.tsx`

````tsx
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

// Context to track composition state across dialog children
const DialogCompositionContext = React.createContext<{
  isComposing: () => boolean;
  setComposing: (composing: boolean) => void;
  justEndedComposing: () => boolean;
  markCompositionEnd: () => void;
}>({
  isComposing: () => false,
  setComposing: () => {},
  justEndedComposing: () => false,
  markCompositionEnd: () => {},
});

export const useDialogComposition = () =>
  React.useContext(DialogCompositionContext);

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const composingRef = React.useRef(false);
  const justEndedRef = React.useRef(false);
  const endTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const contextValue = React.useMemo(
    () => ({
      isComposing: () => composingRef.current,
      setComposing: (composing: boolean) => {
        composingRef.current = composing;
      },
      justEndedComposing: () => justEndedRef.current,
      markCompositionEnd: () => {
        justEndedRef.current = true;
        if (endTimerRef.current) {
          clearTimeout(endTimerRef.current);
        }
        endTimerRef.current = setTimeout(() => {
          justEndedRef.current = false;
        }, 150);
      },
    }),
    []
  );

  return (
    <DialogCompositionContext.Provider value={contextValue}>
      <DialogPrimitive.Root data-slot="dialog" {...props} />
    </DialogCompositionContext.Provider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

DialogOverlay.displayName = "DialogOverlay";

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onEscapeKeyDown,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const { isComposing } = useDialogComposition();

  const handleEscapeKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      // Check both the native isComposing property and our context state
      // This handles Safari's timing issues with composition events
      const isCurrentlyComposing = (e as any).isComposing || isComposing();

      // If IME is composing, prevent dialog from closing
      if (isCurrentlyComposing) {
        e.preventDefault();
        return;
      }

      // Call user's onEscapeKeyDown if provided
      onEscapeKeyDown?.(e);
    },
    [isComposing, onEscapeKeyDown]
  );

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        onEscapeKeyDown={handleEscapeKeyDown}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
};


````

### `client/src/components/ui/drawer.tsx`

````tsx
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left",
        className
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};

````

### `client/src/components/ui/dropdown-menu.tsx`

````tsx
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  );
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
        className
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};

````

### `client/src/components/ui/empty.tsx`

````tsx
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12",
        className
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-2 text-center",
        className
      )}
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-lg font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance",
        className
      )}
      {...props}
    />
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
};

````

### `client/src/components/ui/field.tsx`

````tsx
import { useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-6",
        "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className
      )}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-3 font-medium",
        "data-[variant=legend]:text-base",
        "data-[variant=label]:text-sm",
        className
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
        className
      )}
      {...props}
    />
  );
}

const fieldVariants = cva(
  "group/field flex w-full gap-3 data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
        horizontal: [
          "flex-row items-center",
          "[&>[data-slot=field-label]]:flex-auto",
          "has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        ],
        responsive: [
          "flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto",
          "@md/field-group:[&>[data-slot=field-label]]:flex-auto",
          "@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        ],
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
);

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex flex-1 flex-col gap-1.5 leading-snug",
        className
      )}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4",
        "has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",
        className
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50",
        className
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-muted-foreground text-sm leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance",
        "last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        className
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors) {
      return null;
    }

    if (errors?.length === 1 && errors[0]?.message) {
      return errors[0].message;
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {errors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("text-destructive text-sm font-normal", className)}
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
};

````

### `client/src/components/ui/form.tsx`

````tsx
"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : props.children;

  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};

````

### `client/src/components/ui/hover-card.tsx`

````tsx
import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "@/lib/utils";

function HoverCard({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  );
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };

````

### `client/src/components/ui/input-group.tsx`

````tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group border-input dark:bg-input/30 relative flex w-full items-center rounded-md border shadow-xs transition-[color,box-shadow] outline-none",
        "h-9 min-w-0 has-[>textarea]:h-auto",

        // Variants based on alignment.
        "has-[>[data-align=inline-start]]:[&>input]:pl-2",
        "has-[>[data-align=inline-end]]:[&>input]:pr-2",
        "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",

        // Focus state.
        "has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]",

        // Error state.
        "has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40",

        className
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium select-none [&>svg:not([class*='size-'])]:size-4 [&>kbd]:rounded-[calc(var(--radius)-5px)] group-data-[disabled=true]/input-group:opacity-50",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
        "inline-end":
          "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]",
        "block-start":
          "order-first w-full justify-start px-3 pt-3 [.border-b]:pb-3 group-has-[>input]/input-group:pt-2.5",
        "block-end":
          "order-last w-full justify-start px-3 pb-3 [.border-t]:pt-3 group-has-[>input]/input-group:pb-2.5",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
);

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={e => {
        if ((e.target as HTMLElement).closest("button")) {
          return;
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva(
  "text-sm shadow-none flex gap-2 items-center",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 px-2 rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-3.5 has-[>svg]:px-2",
        sm: "h-8 px-2.5 gap-1.5 rounded-md has-[>svg]:px-2.5",
        "icon-xs":
          "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
);

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-muted-foreground flex items-center gap-2 text-sm [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};

````

### `client/src/components/ui/input-otp.tsx`

````tsx
import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };

````

### `client/src/components/ui/input.tsx`

````tsx
import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

function Input({
  className,
  type,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"input">) {
  // Get dialog composition context if available (will be no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();

  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLInputElement>({
    onKeyDown: (e) => {
      // Check if this is an Enter key that should be blocked
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();

      // If Enter key is pressed while composing or just after composition ended,
      // don't call the user's onKeyDown (this blocks the business logic)
      if (e.key === "Enter" && isComposing) {
        return;
      }

      // Otherwise, call the user's onKeyDown
      onKeyDown?.(e);
    },
    onCompositionStart: e => {
      dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: e => {
      // Mark that composition just ended - this helps handle the Enter key that confirms input
      dialogComposition.markCompositionEnd();
      // Delay setting composing to false to handle Safari's event order
      // In Safari, compositionEnd fires before the ESC keydown event
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Input };

````

### `client/src/components/ui/item.tsx`

````tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn("group/item-group flex flex-col", className)}
      {...props}
    />
  );
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn("my-0", className)}
      {...props}
    />
  );
}

const itemVariants = cva(
  "group/item flex items-center border border-transparent text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-border",
        muted: "bg-muted/50",
      },
      size: {
        default: "p-4 gap-4 ",
        sm: "py-3 px-4 gap-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Item({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof itemVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(itemVariants({ variant, size, className }))}
      {...props}
    />
  );
}

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none group-has-[[data-slot=item-description]]/item:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "size-8 border rounded-sm bg-muted [&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 rounded-sm overflow-hidden [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none",
        className
      )}
      {...props}
    />
  );
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn(
        "flex w-fit items-center gap-2 text-sm leading-snug font-medium",
        className
      )}
      {...props}
    />
  );
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="item-description"
      className={cn(
        "text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  );
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-actions"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-header"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  );
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-footer"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  );
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
};

````

### `client/src/components/ui/kbd.tsx`

````tsx
import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        className
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };

````

### `client/src/components/ui/label.tsx`

````tsx
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };

````

### `client/src/components/ui/menubar.tsx`

````tsx
import * as React from "react";
import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Menubar({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  return (
    <MenubarPrimitive.Root
      data-slot="menubar"
      className={cn(
        "bg-background flex h-9 items-center gap-1 rounded-md border p-1 shadow-xs",
        className
      )}
      {...props}
    />
  );
}

function MenubarMenu({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />;
}

function MenubarGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />;
}

function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />;
}

function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return (
    <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />
  );
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none",
        className
      )}
      {...props}
    />
  );
}

function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content>) {
  return (
    <MenubarPortal>
      <MenubarPrimitive.Content
        data-slot="menubar-content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[12rem] origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-md",
          className
        )}
        {...props}
      />
    </MenubarPortal>
  );
}

function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function MenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  );
}

function MenubarRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  return (
    <MenubarPrimitive.RadioItem
      data-slot="menubar-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  );
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <MenubarPrimitive.Label
      data-slot="menubar-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  );
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return (
    <MenubarPrimitive.Separator
      data-slot="menubar-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  );
}

function MenubarSub({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <MenubarPrimitive.SubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto h-4 w-4" />
    </MenubarPrimitive.SubTrigger>
  );
}

function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  return (
    <MenubarPrimitive.SubContent
      data-slot="menubar-sub-content"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
        className
      )}
      {...props}
    />
  );
}

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
};

````

### `client/src/components/ui/navigation-menu.tsx`

````tsx
import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean;
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn(
        "group flex flex-1 list-none items-center justify-center gap-1",
        className
      )}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:hover:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:focus:bg-accent data-[state=open]:bg-accent/50 focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1"
);

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 top-0 left-0 w-full p-2 pr-2.5 md:absolute md:w-auto",
        "group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:duration-200 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div
      className={cn(
        "absolute top-full left-0 isolate z-50 flex justify-center"
      )}
    >
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "origin-top-center bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border shadow md:w-[var(--radix-navigation-menu-viewport-width)]",
          className
        )}
        {...props}
      />
    </div>
  );
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "data-[active=true]:focus:bg-accent data-[active=true]:hover:bg-accent data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-ring/50 [&_svg:not([class*='text-'])]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="bg-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm shadow-md" />
    </NavigationMenuPrimitive.Indicator>
  );
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
};

````

### `client/src/components/ui/pagination.tsx`

````tsx
import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};

````

### `client/src/components/ui/popover.tsx`

````tsx
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };

````

### `client/src/components/ui/progress.tsx`

````tsx
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

````

### `client/src/components/ui/radio-group.tsx`

````tsx
import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };

````

### `client/src/components/ui/resizable.tsx`

````tsx
import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };

````

### `client/src/components/ui/scroll-area.tsx`

````tsx
import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };

````

### `client/src/components/ui/select.tsx`

````tsx
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};

````

### `client/src/components/ui/separator.tsx`

````tsx
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  );
}

export { Separator };

````

### `client/src/components/ui/sheet.tsx`

````tsx
"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" &&
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};

````

### `client/src/components/ui/sidebar.tsx`

````tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import * as React from "react";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open]
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile(open => !open) : setOpen(open => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  disableTransition = false,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
  disableTransition?: boolean;
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-(--sidebar-width) bg-transparent",
          disableTransition
            ? "transition-none"
            : "transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) md:flex",
          disableTransition
            ? "transition-none"
            : "transition-[left,right,width] duration-200 ease-linear",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-7", className)}
      onClick={event => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "bg-background relative flex w-full flex-1 flex-col",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className
      )}
      {...props}
    />
  );
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn("bg-background h-8 w-full shadow-none", className)}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  showOnHover?: boolean;
}) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean;
  size?: "sm" | "md";
  isActive?: boolean;
}) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar
};


````

### `client/src/components/ui/skeleton.tsx`

````tsx
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };

````

### `client/src/components/ui/slider.tsx`

````tsx
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };

````

### `client/src/components/ui/sonner.tsx`

````tsx
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

````

### `client/src/components/ui/spinner.tsx`

````tsx
import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };

````

### `client/src/components/ui/switch.tsx`

````tsx
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

````

### `client/src/components/ui/table.tsx`

````tsx
import * as React from "react";

import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};

````

### `client/src/components/ui/tabs.tsx`

````tsx
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };

````

### `client/src/components/ui/textarea.tsx`

````tsx
import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

function Textarea({
  className,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"textarea">) {
  // Get dialog composition context if available (will be no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();

  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLTextAreaElement>({
    onKeyDown: (e) => {
      // Check if this is an Enter key that should be blocked
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();

      // If Enter key is pressed while composing or just after composition ended,
      // don't call the user's onKeyDown (this blocks the business logic)
      // Note: For textarea, Shift+Enter should still work for newlines
      if (e.key === "Enter" && !e.shiftKey && isComposing) {
        return;
      }

      // Otherwise, call the user's onKeyDown
      onKeyDown?.(e);
    },
    onCompositionStart: e => {
      dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: e => {
      // Mark that composition just ended - this helps handle the Enter key that confirms input
      dialogComposition.markCompositionEnd();
      // Delay setting composing to false to handle Safari's event order
      // In Safari, compositionEnd fires before the ESC keydown event
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Textarea };

````

### `client/src/components/ui/toggle-group.tsx`

````tsx
"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
});

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        "group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };

````

### `client/src/components/ui/toggle.tsx`

````tsx
import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };

````

### `client/src/components/ui/tooltip.tsx`

````tsx
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

````

### `client/src/const.ts`

````typescript
import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has SIDE EFFECTS — it mints a one-time nonce, writes the __Host- state
// cookie, and navigates immediately — so the cookie nonce always matches the
// `state` it sends. Do NOT call it during render (no `href={startLogin()}` /
// `loginUrl={...}`): each call overwrites the cookie, so a stray render-phase
// call would desync it from an in-flight login and the callback would reject it
// with "invalid oauth state". It returns void by design, so there is no URL to
// stash across renders.
export const startLogin = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  const nonce = crypto.randomUUID();
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  const state = encodeOAuthState({ redirectUri, nonce });

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  window.location.href = url.toString();
};

````

### `client/src/contexts/ThemeContext.tsx`

````tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

````

### `client/src/hooks/useComposition.ts`

````typescript
import { useRef } from "react";
import { usePersistFn } from "./usePersistFn";

export interface UseCompositionReturn<
  T extends HTMLInputElement | HTMLTextAreaElement,
> {
  onCompositionStart: React.CompositionEventHandler<T>;
  onCompositionEnd: React.CompositionEventHandler<T>;
  onKeyDown: React.KeyboardEventHandler<T>;
  isComposing: () => boolean;
}

export interface UseCompositionOptions<
  T extends HTMLInputElement | HTMLTextAreaElement,
> {
  onKeyDown?: React.KeyboardEventHandler<T>;
  onCompositionStart?: React.CompositionEventHandler<T>;
  onCompositionEnd?: React.CompositionEventHandler<T>;
}

type TimerResponse = ReturnType<typeof setTimeout>;

export function useComposition<
  T extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement,
>(options: UseCompositionOptions<T> = {}): UseCompositionReturn<T> {
  const {
    onKeyDown: originalOnKeyDown,
    onCompositionStart: originalOnCompositionStart,
    onCompositionEnd: originalOnCompositionEnd,
  } = options;

  const c = useRef(false);
  const timer = useRef<TimerResponse | null>(null);
  const timer2 = useRef<TimerResponse | null>(null);

  const onCompositionStart = usePersistFn((e: React.CompositionEvent<T>) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (timer2.current) {
      clearTimeout(timer2.current);
      timer2.current = null;
    }
    c.current = true;
    originalOnCompositionStart?.(e);
  });

  const onCompositionEnd = usePersistFn((e: React.CompositionEvent<T>) => {
    // 使用两层 setTimeout 来处理 Safari 浏览器中 compositionEnd 先于 onKeyDown 触发的问题
    timer.current = setTimeout(() => {
      timer2.current = setTimeout(() => {
        c.current = false;
      });
    });
    originalOnCompositionEnd?.(e);
  });

  const onKeyDown = usePersistFn((e: React.KeyboardEvent<T>) => {
    // 在 composition 状态下，阻止 ESC 和 Enter（非 shift+Enter）事件的冒泡
    if (
      c.current &&
      (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey))
    ) {
      e.stopPropagation();
      return;
    }
    originalOnKeyDown?.(e);
  });

  const isComposing = usePersistFn(() => {
    return c.current;
  });

  return {
    onCompositionStart,
    onCompositionEnd,
    onKeyDown,
    isComposing,
  };
}

````

### `client/src/hooks/useMobile.tsx`

````tsx
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

````

### `client/src/hooks/usePersistFn.ts`

````typescript
import { useRef } from "react";

type noop = (...args: any[]) => any;

/**
 * usePersistFn instead of useCallback to reduce cognitive load
 */
export function usePersistFn<T extends noop>(fn: T) {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T>(null);
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args) {
      return fnRef.current!.apply(this, args);
    } as T;
  }

  return persistFn.current!;
}

````

### `client/src/index.css`

````css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;900&family=Space+Grotesk:wght@500;700&display=swap');
@import "tailwindcss";
@import "tw-animate-css";

/* Style reminder: reference-faithful deep-ocean tech landing page; use #24C7F3 as signature cyan and #8B6DFF as creative violet. */
:root { --cyan:#24c7f3; --cyan-deep:#0b9bc4; --violet:#8b6dff; --ink:#071426; --navy:#0b1c34; --panel:#102943; --muted:#97abc4; --cream:#fff5df; --yellow:#ffd34e; --line:rgba(148,194,228,.18); --radius:24px; }
* { box-sizing:border-box; }
html { scroll-behavior:smooth; }
body { margin:0; background:var(--ink); color:#eff7ff; font-family:'Noto Sans TC',sans-serif; }
button,a { font:inherit; }
button { border:0; }
a { color:inherit; text-decoration:none; }
.site-shell { min-height:100vh; overflow:hidden; background:radial-gradient(circle at 78% 5%,rgba(31,94,148,.3),transparent 27rem),linear-gradient(135deg,#071426 0%,#0b233d 48%,#09172b 100%); }
.topbar { height:68px; display:flex; align-items:center; gap:28px; position:sticky; top:0; z-index:50; padding:0 clamp(18px,4vw,60px); background:rgba(7,20,38,.83); border-bottom:1px solid rgba(126,190,226,.13); backdrop-filter:blur(18px); }
.brand,.footer-brand { display:flex; align-items:center; gap:10px; flex-shrink:0; }
.brand img,.footer-brand img { width:38px; height:38px; object-fit:contain; border-radius:9px; background:var(--cream); }
.brand span,.footer-brand div { display:flex; flex-direction:column; line-height:1.1; }
.brand strong,.footer-brand strong { font-size:15px; letter-spacing:.02em; }
.brand small,.footer-brand small { color:#9fb3c9; font-size:10px; font-family:'Space Grotesk',sans-serif; letter-spacing:.04em; }
.nav-links { display:flex; align-items:center; justify-content:center; gap:26px; margin-left:auto; }
.nav-links button,.nav-links a { color:#b7c8db; background:none; font-size:13px; transition:color .18s ease; cursor:pointer; }
.nav-links button:hover,.nav-links a:hover { color:var(--cyan); }
.menu-button { display:none; background:none; color:white; }
.button { display:inline-flex; align-items:center; justify-content:center; gap:8px; border-radius:999px; padding:12px 19px; font-weight:700; font-size:14px; cursor:pointer; transition:transform .18s ease,box-shadow .18s ease,background .18s ease; }
.button:active { transform:scale(.97); }
.button-primary { color:#061326; background:linear-gradient(110deg,var(--cyan),#40d7ed 54%,#a083ff); box-shadow:0 8px 26px rgba(36,199,243,.18); }
.button-primary:hover { transform:translateY(-2px); box-shadow:0 13px 30px rgba(36,199,243,.28); }
.button-secondary { color:#ecf8ff; background:rgba(14,45,75,.72); border:1px solid rgba(46,211,247,.58); }
.button-secondary:hover { background:rgba(22,73,111,.84); transform:translateY(-2px); }
.button-outline { color:#d8e9f8; border:1px solid rgba(142,191,223,.3); background:rgba(12,34,58,.65); }
.button-outline:hover { color:white; border-color:var(--cyan); }
.header-cta { margin-left:8px; padding:10px 17px; font-size:13px; }
.section-pad { padding:clamp(76px,9vw,126px) clamp(20px,7vw,110px); }
.hero { min-height:630px; display:grid; grid-template-columns:minmax(0,1.04fr) minmax(360px,.96fr); align-items:center; gap:clamp(40px,8vw,130px); position:relative; padding-top:92px; padding-bottom:112px; }
.ambient { position:absolute; border-radius:999px; pointer-events:none; filter:blur(4px); opacity:.48; }
.orb-one { width:460px; height:460px; right:10%; top:45px; background:radial-gradient(circle,rgba(33,179,235,.14),transparent 68%); }
.orb-two { width:380px; height:380px; left:25%; bottom:-130px; background:radial-gradient(circle,rgba(139,109,255,.12),transparent 68%); }
.hero-copy,.hero-visual { position:relative; z-index:1; }
.eyebrow { display:inline-flex; align-items:center; gap:7px; color:var(--cyan); font-size:13px; letter-spacing:.04em; margin-bottom:18px; }
.eyebrow::before { content:''; width:25px; height:1px; background:currentColor; }
h1,h2,h3,p { margin-top:0; }
h1 { margin:0 0 23px; font-size:clamp(42px,5.2vw,72px); line-height:1.12; letter-spacing:-.065em; font-weight:900; }
h1 span,h2 span { background:linear-gradient(100deg,#22d0f4 12%,#5b9ef7 52%,#a084ff 92%); color:transparent; background-clip:text; }
.hero-lead { max-width:580px; color:#bbcadb; font-size:16px; line-height:1.95; }
.hero-lead b { color:var(--cyan); font-weight:700; }
.legal-note { max-width:530px; margin:25px 0 18px; padding:14px 17px; color:#9eb3c9; background:rgba(8,25,45,.6); border:1px solid rgba(147,184,212,.16); border-radius:14px; font-size:12px; line-height:1.7; }
.hero-actions { display:flex; flex-wrap:wrap; gap:11px; margin:18px 0 21px; }
.trust-row { display:flex; flex-wrap:wrap; gap:18px; color:#9aafc6; font-size:12px; }
.trust-row span { display:inline-flex; align-items:center; gap:5px; }
.trust-row svg { color:#54d8c4; }
.coupon-card { display:flex; align-items:center; gap:13px; width:min(100%,530px); margin-top:28px; padding:14px 17px; text-align:left; color:white; background:rgba(11,35,61,.72); border:1px solid rgba(119,173,206,.17); border-radius:15px; cursor:pointer; transition:transform .2s ease,border-color .2s ease; }
.coupon-card:hover { transform:translateY(-2px); border-color:rgba(36,199,243,.55); }
.coupon-card svg:first-child { color:var(--yellow); }
.coupon-card span { display:flex; flex-direction:column; flex:1; }
.coupon-card strong { font-size:13px; margin-bottom:3px; }.coupon-card small { color:#9fb2c5; font-size:11px; }
.hero-visual { min-height:450px; display:flex; align-items:center; justify-content:center; }
.hero-art-frame { width:min(390px,84%); aspect-ratio:1; padding:17px; border-radius:23px; background:linear-gradient(145deg,rgba(33,86,120,.82),rgba(8,26,49,.7)); border:1px solid rgba(74,178,221,.25); box-shadow:0 24px 70px rgba(0,0,0,.32),inset 0 1px rgba(255,255,255,.1); transform:rotate(2.4deg); }
.hero-art-frame img { width:100%; height:100%; object-fit:cover; border-radius:13px; }
.floating-chip { position:absolute; display:flex; align-items:center; gap:8px; width:65%; padding:11px 16px; color:#e8f6ff; background:rgba(14,45,75,.88); border:1px solid rgba(64,184,225,.25); border-radius:999px; box-shadow:0 13px 26px rgba(0,0,0,.2); font-size:12px; }
.floating-chip svg { color:var(--cyan); }.chip-style { bottom:64px; left:5%; }.chip-speed { bottom:6px; right:2%; }.chip-speed svg { color:var(--yellow); }
.scanline { position:absolute; width:240px; height:2px; right:4%; top:20%; background:linear-gradient(90deg,transparent,var(--cyan),transparent); opacity:.34; animation:scan 4.2s ease-in-out infinite; }
@keyframes scan { 0%,100%{transform:translateY(-40px);opacity:.1} 50%{transform:translateY(170px);opacity:.55} }
.announcement { display:flex; align-items:center; gap:16px; padding-top:26px; padding-bottom:26px; background:linear-gradient(90deg,rgba(13,38,63,.9),rgba(12,42,65,.45)); border-top:1px solid rgba(94,168,204,.13); border-bottom:1px solid rgba(94,168,204,.13); }
.announcement-icon { width:28px; height:28px; display:grid; place-items:center; color:#071426; background:#5de6bf; border-radius:50%; font-weight:900; }.announcement strong { font-size:14px; }.announcement p { margin:4px 0 0; color:#9eb4ca; font-size:12px; }.text-link { display:inline-flex; align-items:center; gap:7px; margin-left:auto; color:var(--cyan); font-size:13px; font-weight:700; }
.feature-section { background:linear-gradient(180deg,rgba(7,20,38,.2),rgba(10,32,55,.68)); }.section-heading { max-width:730px; }.section-heading.center { margin-inline:auto; text-align:center; }.section-heading h2 { margin-bottom:12px; font-size:clamp(33px,4vw,53px); line-height:1.18; letter-spacing:-.05em; }.section-heading p { color:#9fb1c3; line-height:1.8; }.feature-layout { display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:clamp(35px,8vw,130px); margin-top:52px; }.feature-art { padding:22px; background:linear-gradient(140deg,rgba(28,74,109,.72),rgba(8,25,47,.68)); border:1px solid rgba(71,171,214,.17); border-radius:22px; }.feature-art img { width:100%; display:block; border-radius:13px; }.feature-list { display:grid; gap:8px; }.feature-item { display:flex; gap:19px; padding:19px 0; border-bottom:1px solid rgba(160,194,219,.12); }.feature-icon { width:45px; height:45px; display:grid; place-items:center; flex-shrink:0; font-size:24px; background:rgba(17,55,84,.72); border:1px solid rgba(91,179,219,.15); border-radius:13px; }.feature-item h3 { margin:1px 0 7px; font-size:17px; }.feature-item p { margin:0; color:#9eb2c5; font-size:13px; line-height:1.7; }
.gallery-section { background:linear-gradient(180deg,#0a2038,#08182c); }.product-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:49px; }.product-card { padding:12px; background:rgba(13,38,64,.72); border:1px solid rgba(107,173,211,.15); border-radius:18px; transition:transform .24s ease,border-color .24s ease,box-shadow .24s ease; }.product-card:hover { transform:translateY(-5px); border-color:rgba(36,199,243,.52); box-shadow:0 18px 38px rgba(0,0,0,.24); }.product-image { position:relative; overflow:hidden; aspect-ratio:1.35; background:#efe2cb; border-radius:12px; }.product-image img { width:100%; height:100%; object-fit:cover; }.status,.visit { position:absolute; top:10px; padding:6px 9px; border-radius:999px; font-size:10px; font-weight:700; }.status { left:10px; background:rgba(8,24,42,.82); color:#eaf6ff; }.status.hot { color:#ffd875; }.visit { right:10px; display:flex; align-items:center; gap:4px; color:#def7ff; background:rgba(8,25,43,.75); opacity:0; transform:translateY(-4px); transition:.2s ease; }.product-card:hover .visit { opacity:1; transform:translateY(0); }.product-info { display:flex; align-items:flex-start; justify-content:space-between; padding:14px 4px 4px; }.product-info h3 { margin:0 0 4px; font-size:14px; }.product-info p { margin:0; color:#91a7bb; font-size:11px; }.product-info > strong { color:#ffd873; font-family:'Space Grotesk',sans-serif; }.gallery-sheet { display:grid; grid-template-columns:.74fr 1.26fr; gap:40px; align-items:center; margin-top:74px; padding:30px; background:linear-gradient(120deg,rgba(16,52,83,.8),rgba(10,28,51,.7)); border:1px solid rgba(108,183,221,.16); border-radius:25px; }.gallery-sheet h3 { margin:0 0 12px; font-size:25px; }.gallery-sheet p { color:#9eb3c5; line-height:1.8; font-size:13px; }.sheet-art { position:relative; display:block; padding:0; overflow:hidden; background:#0c2038; border-radius:15px; cursor:pointer; }.sheet-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; padding:12px; background:linear-gradient(135deg,#f5e9d2,#d7d5e6); }.sheet-grid img { width:100%; aspect-ratio:1; object-fit:cover; border-radius:9px; transition:transform .4s ease; }.sheet-art:hover .sheet-grid img { transform:scale(1.04); }.sheet-art span { position:absolute; right:14px; bottom:13px; display:flex; align-items:center; gap:6px; padding:8px 11px; color:white; background:rgba(8,24,42,.78); border-radius:999px; font-size:11px; }
.download-section { background:radial-gradient(circle at 15% 30%,rgba(37,110,153,.13),transparent 35%),#08182d; }.compare-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; max-width:820px; margin:48px auto 29px; }.compare-card { position:relative; padding:28px; border-radius:21px; border:1px solid rgba(139,176,203,.16); background:rgba(14,36,61,.65); }.compare-card.recommended { border-color:rgba(36,199,243,.48); background:linear-gradient(135deg,rgba(19,62,90,.88),rgba(18,42,74,.64)); box-shadow:0 15px 35px rgba(0,0,0,.17); }.compare-symbol { font-size:31px; margin-bottom:12px; }.compare-card h3 { margin-bottom:18px; font-size:20px; }.compare-card ul,.plan-card ul { display:grid; gap:11px; padding:0; margin:0 0 25px; list-style:none; color:#a2b5c8; font-size:13px; line-height:1.5; }.recommend-label { position:absolute; right:20px; top:19px; padding:5px 10px; color:#061426; background:var(--cyan); border-radius:999px; font-size:10px; font-weight:800; }.price-strip { display:flex; align-items:center; flex-wrap:wrap; justify-content:center; gap:11px; max-width:820px; margin:auto; padding:19px; color:#9bb1c4; background:rgba(15,41,68,.57); border:1px solid rgba(121,179,211,.14); border-radius:14px; }.price-strip span { width:100%; text-align:center; color:#e9f6ff; font-weight:700; font-size:13px; }.price-strip strong { padding:8px 12px; color:#ffd976; border:1px solid rgba(255,211,78,.24); border-radius:8px; font-family:'Space Grotesk',sans-serif; font-size:13px; }.price-strip small { width:100%; text-align:center; font-size:10px; }
.pricing-section { background:linear-gradient(180deg,#0a1e36,#09172a); }.plans { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:51px; }.plan-card { position:relative; padding:27px; background:rgba(16,42,70,.68); border:1px solid rgba(115,173,207,.16); border-radius:20px; }.plan-card.popular { border-color:rgba(36,199,243,.58); background:linear-gradient(160deg,rgba(17,65,96,.86),rgba(17,39,70,.8)); box-shadow:0 20px 45px rgba(0,0,0,.16); }.popular-ribbon { display:flex; align-items:center; gap:6px; position:absolute; top:-13px; left:24px; padding:6px 11px; color:#071426; background:linear-gradient(90deg,var(--cyan),#9ff6f1); border-radius:999px; font-size:10px; font-weight:900; }.plan-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:19px; }.plan-top span { color:#9bb5ca; font-size:13px; }.plan-top strong { color:var(--cyan); font-family:'Space Grotesk',sans-serif; font-size:20px; }.plan-card p { min-height:43px; color:#a2b4c8; font-size:12px; line-height:1.7; }.plan-price { margin:16px 0 20px; color:white; font-size:28px; font-weight:900; letter-spacing:-.04em; }.plan-price small { color:#91a8bb; font-size:11px; font-weight:500; margin-left:4px; }.plan-card ul { padding-top:17px; border-top:1px solid rgba(144,190,218,.13); }.plan-card li { display:flex; align-items:flex-start; gap:8px; }.plan-card li svg { color:#66e3c6; flex-shrink:0; margin-top:2px; }.plan-card .button { width:100%; }
.guide-section { padding-top:72px; padding-bottom:72px; }.guide-panel { display:grid; grid-template-columns:1fr 1.1fr; gap:46px; align-items:center; padding:clamp(28px,5vw,60px); background:linear-gradient(120deg,rgba(23,68,99,.8),rgba(13,34,60,.82)); border:1px solid rgba(90,178,218,.22); border-radius:27px; }.guide-panel h2 { margin-bottom:16px; font-size:clamp(31px,3.3vw,47px); line-height:1.25; }.guide-panel p { color:#9fb4c7; line-height:1.8; font-size:13px; }.steps { display:grid; gap:17px; }.step { display:flex; gap:15px; align-items:flex-start; }.step > span { color:var(--cyan); font-family:'Space Grotesk'; font-size:13px; letter-spacing:.08em; }.step strong { display:block; font-size:14px; margin-bottom:4px; }.step p { margin:0; font-size:12px; }.guide-panel > .button { justify-self:start; }
.faq-section { padding-top:78px; }.faq-list { max-width:760px; margin-top:39px; }.faq-item { border-bottom:1px solid rgba(132,176,205,.17); }.faq-item button { width:100%; display:flex; justify-content:space-between; padding:19px 0; color:#e8f4ff; background:none; cursor:pointer; text-align:left; font-weight:700; font-size:14px; }.faq-item button svg { color:var(--cyan); }.faq-item p { margin:0; padding:0 36px 20px 0; color:#a1b5c8; font-size:13px; line-height:1.8; }
.footer { display:grid; grid-template-columns:1fr 1fr 1.7fr; align-items:center; gap:26px; padding:37px clamp(20px,7vw,110px) 30px; border-top:1px solid rgba(114,163,194,.14); background:#061222; }.footer p { margin:0; color:#93aabe; font-size:12px; }.footer-links { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:15px; color:#92a8ba; font-size:11px; }.footer-links a:hover { color:var(--cyan); }.copyright { grid-column:1 / -1; color:#5f7388; font-size:10px; }
.toast { position:fixed; top:86px; right:22px; z-index:100; display:flex; align-items:center; gap:8px; padding:12px 17px; color:#071426; background:#c9fbf8; box-shadow:0 14px 30px rgba(0,0,0,.3); border-radius:12px; font-size:12px; font-weight:700; animation:toast-in .24s ease-out; }@keyframes toast-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.lightbox { position:fixed; inset:0; z-index:90; display:grid; place-items:center; padding:25px; background:rgba(2,10,20,.88); backdrop-filter:blur(12px); }.lightbox-content { width:min(430px,90vw); padding:15px; background:#102944; border:1px solid rgba(114,207,232,.35); border-radius:19px; }.lightbox-content img { display:block; width:100%; max-height:70vh; object-fit:contain; background:var(--cream); border-radius:10px; }.close-lightbox { position:fixed; top:22px; right:22px; display:grid; place-items:center; width:40px; height:40px; color:white; background:rgba(20,55,82,.8); border-radius:50%; cursor:pointer; }.preview-dots { display:flex; justify-content:center; gap:6px; padding-top:12px; }.preview-dots button { width:7px; height:7px; padding:0; background:#57748e; border-radius:50%; cursor:pointer; }.preview-dots button.active { background:var(--cyan); box-shadow:0 0 9px var(--cyan); }
.reveal { animation:reveal .7s cubic-bezier(.23,1,.32,1) both; }.delay-one { animation-delay:.12s; }@keyframes reveal { from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)} }
@media (max-width: 900px) { .topbar { gap:14px; }.nav-links { gap:15px; }.hero { grid-template-columns:1fr; padding-top:70px; }.hero-copy { max-width:700px; }.hero-visual { min-height:390px; }.feature-layout,.gallery-sheet,.guide-panel { grid-template-columns:1fr; }.feature-art { max-width:600px; }.product-grid { grid-template-columns:repeat(2,1fr); }.plans { grid-template-columns:1fr; max-width:460px; margin-inline:auto; margin-top:48px; }.footer { grid-template-columns:1fr 1fr; }.footer-links { justify-content:flex-start; }.copyright { grid-column:1/-1; } }
@media (max-width: 650px) { .topbar { height:61px; padding:0 17px; }.brand img { width:34px;height:34px; }.brand strong { font-size:13px; }.nav-links { display:none; position:absolute; top:61px; right:12px; left:12px; flex-direction:column; align-items:stretch; padding:12px; background:rgba(8,24,44,.97); border:1px solid rgba(81,171,216,.24); border-radius:15px; box-shadow:0 17px 35px rgba(0,0,0,.3); }.nav-links.open { display:flex; }.nav-links button,.nav-links a { padding:11px 12px; text-align:left; }.menu-button { display:grid; place-items:center; margin-left:auto; }.header-cta { padding:9px 13px; font-size:12px; margin-left:0; }.header-cta svg { display:none; }.section-pad { padding:66px 19px; }.hero { min-height:auto; padding-top:70px; padding-bottom:82px; gap:34px; }.hero-lead { font-size:14px; line-height:1.85; }.hero-actions { flex-direction:column; align-items:stretch; }.hero-actions .button { width:100%; }.trust-row { gap:10px; font-size:11px; }.hero-visual { min-height:320px; }.hero-art-frame { width:min(300px,82%); }.floating-chip { width:69%; padding:9px 12px; font-size:11px; }.chip-style { bottom:43px; left:0; }.chip-speed { bottom:0; right:0; }.announcement { align-items:flex-start; flex-wrap:wrap; padding-top:21px; padding-bottom:21px; }.announcement .text-link { width:100%; margin-left:44px; }.section-heading h2 { font-size:34px; }.feature-layout { margin-top:34px; gap:29px; }.product-grid { grid-template-columns:1fr 1fr; gap:10px; margin-top:32px; }.product-card { padding:8px; border-radius:14px; }.product-info { padding:10px 2px 2px; }.product-info h3 { font-size:12px; }.product-info p { font-size:9px; }.product-info > strong { font-size:12px; }.status { left:6px; top:6px; padding:4px 6px; font-size:8px; }.visit { display:none; }.gallery-sheet { margin-top:46px; padding:18px; gap:22px; }.gallery-sheet h3 { font-size:21px; }.sheet-grid { gap:5px; padding:8px; }.compare-grid { grid-template-columns:1fr; margin-top:32px; }.compare-card { padding:22px; }.price-strip { gap:7px; }.price-strip strong { font-size:11px; padding:7px 8px; }.guide-panel { padding:25px 21px; gap:28px; }.footer { grid-template-columns:1fr; gap:17px; }.footer-links { gap:11px; }.copyright { grid-column:auto; }.toast { left:17px; right:17px; top:76px; justify-content:center; } }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { scroll-behavior:auto!important; animation-duration:.001ms!important; transition-duration:.001ms!important; } }

/* Style reminder: creator studio extension keeps the reference dark-ocean visual language while making every creation step actionable inside the page. */
.studio-section{background:radial-gradient(circle at 85% 20%,rgba(36,199,243,.08),transparent 28rem),#091c31}.studio-layout{display:grid;grid-template-columns:minmax(310px,.83fr) minmax(420px,1.17fr);gap:22px;margin-top:46px;align-items:start}.studio-controls,.studio-preview{padding:25px;background:rgba(13,39,65,.78);border:1px solid rgba(114,185,221,.18);border-radius:22px}.studio-controls{display:grid;gap:19px}.studio-step{display:flex;gap:14px;padding-bottom:19px;border-bottom:1px solid rgba(141,188,216,.12)}.studio-step:last-of-type{border-bottom:0;padding-bottom:1px}.step-number{width:30px;height:30px;display:grid;place-items:center;flex-shrink:0;color:#08182c;background:var(--cyan);border-radius:9px;font:700 12px 'Space Grotesk'}.step-content{min-width:0;flex:1}.step-content h3{margin:2px 0 6px;font-size:15px}.step-content h3 small{float:right;color:#86a9c2;font-size:11px;font-weight:500}.step-content>p{margin:0 0 13px;color:#91a9bd;font-size:11px;line-height:1.6}.upload-zone{width:100%;min-height:112px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#b9cddb;background:rgba(5,22,40,.6);border:1px dashed rgba(36,199,243,.48);border-radius:15px;cursor:pointer;transition:.2s ease}.upload-zone:hover{border-color:var(--cyan);background:rgba(18,62,88,.65);transform:translateY(-2px)}.upload-zone svg{color:var(--cyan)}.upload-zone strong{font-size:12px}.upload-zone small{color:#7892aa;font-size:10px}.file-state{display:flex;align-items:center;gap:7px;margin-top:9px;padding:8px 10px;color:#aee8d5;background:rgba(45,146,121,.12);border:1px solid rgba(91,226,186,.18);border-radius:9px;font-size:11px}.file-state svg:first-child{color:#62e4bc}.file-state button{display:grid;place-items:center;margin-left:auto;padding:2px;color:#8aaabd;background:none;cursor:pointer}.style-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.style-option{position:relative;display:flex;align-items:center;gap:8px;padding:10px;color:#a9bdce;text-align:left;background:rgba(6,24,43,.6);border:1px solid rgba(128,174,204,.15);border-radius:12px;cursor:pointer;transition:.2s ease}.style-option span{font-size:19px}.style-option strong{font-size:11px}.style-option svg{position:absolute;right:8px;color:var(--cyan)}.style-option.active{color:#e9f8ff;border-color:rgba(36,199,243,.75);background:rgba(19,74,100,.58);box-shadow:0 0 0 1px rgba(36,199,243,.12)}.emotion-grid{display:flex;flex-wrap:wrap;gap:7px}.emotion{padding:8px 11px;color:#92a9bc;background:rgba(7,24,43,.7);border:1px solid rgba(129,176,205,.16);border-radius:999px;cursor:pointer;font-size:11px;transition:.18s ease}.emotion:hover,.emotion.active{color:#061426;background:var(--cyan);border-color:var(--cyan)}.generate-button{width:100%;margin-top:1px}.generate-button:disabled{cursor:wait;opacity:.75}.progress-track{height:6px;overflow:hidden;background:#06172a;border-radius:999px}.progress-track div{height:100%;background:linear-gradient(90deg,var(--cyan),var(--violet));border-radius:999px;transition:width .24s ease}.studio-preview{min-height:610px;background:linear-gradient(145deg,rgba(20,59,88,.86),rgba(8,25,45,.88));border-color:rgba(91,192,224,.23)}.preview-placeholder{min-height:500px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#7894aa;text-align:center}.preview-placeholder svg{color:#2abedb}.preview-placeholder strong{color:#d5e8f4;font-size:16px}.preview-placeholder span{font-size:11px}.preview-meta{display:flex;justify-content:space-between;padding-top:15px;color:#7f9bb0;border-top:1px solid rgba(141,188,216,.12);font-size:11px}.generating{min-height:560px}.loader-ring{width:48px;height:48px;border:3px solid rgba(36,199,243,.18);border-top-color:var(--cyan);border-right-color:var(--violet);border-radius:50%;animation:spin 1s linear infinite}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.result-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.result-head .eyebrow{margin:0 0 4px;font-size:11px}.result-head h3{margin:0;font-size:22px}.icon-button{display:grid;place-items:center;width:37px;height:37px;color:#a8c0d0;background:rgba(7,25,44,.75);border:1px solid rgba(123,177,207,.22);border-radius:10px;cursor:pointer}.icon-button:hover{color:var(--cyan);border-color:var(--cyan)}.result-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.result-sticker{padding:9px;background:rgba(7,23,41,.64);border:1px solid rgba(120,177,207,.13);border-radius:14px}.sticker-photo{position:relative;aspect-ratio:1;overflow:hidden;background-position:center;background-size:cover;background-color:var(--cream);border:3px solid;border-radius:12px}.sticker-photo::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,15,28,.04),rgba(4,15,28,.45))}.sticker-photo span{position:absolute;z-index:1;right:8px;bottom:8px;left:8px;color:white;text-align:center;text-shadow:0 2px 7px #03101e;font-size:17px;font-weight:900}.sticker-photo i{position:absolute;z-index:1;top:8px;right:8px;font-style:normal;font-size:18px}.result-actions{display:flex;align-items:center;justify-content:space-between;padding:8px 2px 0;color:#b5cada;font-size:11px}.result-actions button{display:grid;place-items:center;width:26px;height:26px;color:var(--cyan);background:rgba(20,76,103,.5);border-radius:7px;cursor:pointer}.result-footer{display:flex;gap:9px;margin-top:15px}.result-footer .button{flex:1;padding:10px 11px;font-size:12px}.gallery-cta{display:flex;margin:31px auto 0}.inspiration-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-top:45px}.inspiration-sticker{padding:7px;background:rgba(21,53,80,.7);border:1px solid rgba(96,177,215,.17);border-radius:15px}.inspiration-sticker>div{position:relative;aspect-ratio:1;background-size:cover;background-position:center;border-radius:10px;overflow:hidden}.inspiration-sticker>div::after{content:'';position:absolute;inset:0;background:rgba(8,20,34,.25)}.inspiration-sticker span{position:absolute;z-index:1;right:5px;bottom:10px;left:5px;color:white;text-align:center;text-shadow:0 2px 5px #001;font-size:12px;font-weight:900}.floating-create{position:fixed;right:22px;bottom:22px;z-index:40;display:flex;align-items:center;gap:7px;padding:12px 16px;color:#061426;background:linear-gradient(100deg,var(--cyan),#a184ff);border-radius:999px;box-shadow:0 14px 28px rgba(0,0,0,.3);font-size:12px;font-weight:800;cursor:pointer}.footer-links button{padding:0;color:#92a8ba;background:none;cursor:pointer;font-size:11px}.footer-links button:hover{color:var(--cyan)}
@media(max-width:900px){.studio-layout{grid-template-columns:1fr}.studio-preview{min-height:520px}.inspiration-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:650px){.studio-controls,.studio-preview{padding:18px}.studio-preview{min-height:470px}.preview-placeholder{min-height:355px}.generating{min-height:410px}.result-grid{gap:8px}.result-footer{flex-direction:column}.inspiration-grid{gap:8px}.inspiration-sticker{padding:5px}.inspiration-sticker span{font-size:10px}.floating-create{right:15px;bottom:15px}.free-note{margin-top:20px}}

/* Style reminder: minimal footer removes navigation noise and leaves only brand, promise, and contact. */
.footer-minimal{display:flex;align-items:center;gap:34px;padding-top:32px;padding-bottom:34px}.footer-minimal .footer-brand{margin:0}.footer-minimal>p{margin:0;color:#8ea5b7;font-size:12px}.footer-contact{display:inline-flex;align-items:center;gap:6px;margin-left:auto;color:#8ea5b7;font-size:12px}.footer-contact:hover{color:var(--cyan)}
@media(max-width:650px){.footer-minimal{display:grid;grid-template-columns:1fr auto;gap:14px 18px;padding-top:25px;padding-bottom:25px}.footer-minimal>p{grid-column:1/-1;grid-row:2}.footer-contact{grid-column:2;grid-row:1}}

/* Style reminder: simplified hero prioritizes the creation CTA and removes decorative visual noise from the fold. */
.hero-simplified{min-height:620px;display:flex;align-items:center}.hero-simplified .hero-copy{max-width:760px}.hero-simplified .hero-lead{max-width:620px}.hero-simplified .hero-actions{margin-top:28px}.hero-simplified .trust-row{margin-top:22px}
@media(max-width:650px){.hero-simplified{min-height:540px;padding-top:74px;padding-bottom:58px}.hero-simplified .hero-copy{max-width:none}.hero-simplified .hero-lead{max-width:none}.hero-simplified .hero-actions{margin-top:23px}.hero-simplified .trust-row{margin-top:18px;flex-wrap:wrap;gap:8px 15px}}

/* AI sticker project wizard */
.wizard-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:.65rem;margin:1.5rem 0}.wizard-step{display:flex;align-items:center;gap:.55rem;padding:.75rem .85rem;border:1px solid rgba(118,172,218,.18);border-radius:16px;background:rgba(12,37,67,.48);color:#7894ad;font-size:.82rem}.wizard-step span{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;border:1px solid currentColor;font-size:.7rem}.wizard-step.active{color:#7fe6ff;border-color:rgba(83,222,255,.55);background:rgba(13,73,103,.38)}.wizard-step.complete{color:#9bf4c5}.wizard-panel{display:grid;grid-template-columns:72px minmax(0,1fr);gap:1.25rem;padding:1.45rem;border:1px solid rgba(105,178,231,.22);border-radius:26px;background:linear-gradient(135deg,rgba(11,40,73,.82),rgba(7,24,48,.72));box-shadow:0 22px 60px rgba(0,0,0,.18)}.panel-icon{display:grid;place-items:center;width:54px;height:54px;border-radius:18px;color:#07192c;background:linear-gradient(135deg,#ffcf70,#66e0ff);font-weight:800}.wizard-form h3{margin:0;color:#f3f9ff;font-size:1.35rem}.wizard-form>p,.wizard-form h3+p{color:#8ca8c0;line-height:1.7;margin:.45rem 0 1rem}.project-brief{min-height:100px;resize:vertical}.form-grid{display:grid;grid-template-columns:1.2fr 1fr .8fr;gap:.8rem;margin:1rem 0}.form-grid label,.wizard-form>label{display:grid;gap:.45rem;color:#a6bfd3;font-size:.83rem}.prompt-input{width:100%;border:1px solid rgba(133,189,225,.2);border-radius:13px;background:rgba(3,18,37,.66);color:#e9f5ff;padding:.78rem .85rem;outline:none}.prompt-input:focus{border-color:#55dbff;box-shadow:0 0 0 3px rgba(85,219,255,.12)}select.prompt-input{appearance:auto}.multi-upload-zone{display:grid;place-items:center;gap:.4rem;min-height:154px;width:100%;border:1px dashed rgba(91,219,255,.48);border-radius:20px;background:rgba(11,66,92,.2);color:#9aeaff;cursor:pointer}.multi-upload-zone strong{color:#f3f9ff}.multi-upload-zone small{color:#7696ad}.reference-strip{display:flex;gap:.7rem;overflow:auto;padding:.8rem 0 1rem}.reference-thumb{position:relative;flex:0 0 74px}.reference-thumb img{display:block;width:74px;height:74px;object-fit:cover;border-radius:15px;border:1px solid rgba(121,211,244,.35)}.reference-thumb button{position:absolute;top:-6px;right:-6px;display:grid;place-items:center;width:22px;height:22px;border:0;border-radius:50%;background:#ff7d9c;color:#1d1230;cursor:pointer}.reference-thumb small{display:block;text-align:center;margin-top:.25rem;color:#81a7c0}.panel-heading-row,.batch-summary-top{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.count-pill{white-space:nowrap;border:1px solid rgba(91,221,255,.3);border-radius:999px;padding:.45rem .7rem;color:#88eaff;font-size:.75rem}.wizard-actions,.batch-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.65rem;margin-top:1.2rem}.small-button{padding:.6rem .8rem!important;font-size:.78rem!important}.script-table{display:grid;gap:.55rem;max-height:520px;overflow:auto;padding:.35rem;margin-top:.8rem}.script-row{display:grid;grid-template-columns:38px 1fr 1fr 2fr 30px;gap:.5rem;align-items:center}.script-number{display:grid;place-items:center;color:#6bdfff;font-size:.75rem}.script-row button{display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:9px;background:rgba(255,117,153,.1);color:#ff9db6;cursor:pointer}.batch-layout{display:grid;gap:1rem}.batch-summary{padding:1.35rem;border-radius:22px;border:1px solid rgba(115,193,227,.2);background:rgba(8,34,63,.7)}.batch-summary h3{margin:.35rem 0;color:#f3f9ff}.batch-summary p{color:#8aa9bf;font-size:.84rem}.batch-progress{height:9px;overflow:hidden;border-radius:999px;background:#122e4c;margin:1rem 0}.batch-progress div{height:100%;border-radius:inherit;background:linear-gradient(90deg,#57e0ff,#a68bff);transition:width .25s ease}.batch-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.75rem;min-height:170px}.batch-card{overflow:hidden;border:1px solid rgba(111,183,224,.16);border-radius:18px;background:rgba(9,35,63,.72);cursor:pointer;transition:transform .2s ease,border-color .2s ease}.batch-card:hover,.batch-card.selected{transform:translateY(-3px);border-color:#5fdfff}.batch-image-wrap{position:relative;aspect-ratio:1;background:repeating-conic-gradient(#17344f 0 25%,#102a43 0 50%) 50%/18px 18px}.batch-image-wrap img{width:100%;height:100%;object-fit:contain}.batch-index{position:absolute;top:7px;left:7px;padding:.25rem .35rem;border-radius:7px;background:rgba(2,16,32,.75);color:#9cecff;font-size:.65rem}.batch-card-footer{display:flex;align-items:center;gap:.35rem;padding:.6rem .65rem}.batch-card-footer strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eaf6ff;font-size:.78rem}.batch-card-footer button{margin-left:auto;display:grid;place-items:center;width:26px;height:26px;border:0;border-radius:8px;background:rgba(102,222,255,.12);color:#9beaff;cursor:pointer}.quality-ok,.quality-warn{font-size:.62rem;white-space:nowrap}.quality-ok{color:#9bf4c5}.quality-warn{color:#ffcf70}.project-chat{margin-top:1rem}.project-chat .eyebrow{display:flex;align-items:center;gap:.35rem}.project-chat .chat-messages{max-height:210px}.button:disabled{opacity:.52;cursor:not-allowed}.button:active{transform:scale(.97)}
@media (max-width:900px){.form-grid{grid-template-columns:1fr}.batch-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.wizard-progress{grid-template-columns:repeat(2,1fr)}}
@media (max-width:620px){.wizard-panel{grid-template-columns:1fr;padding:1rem;border-radius:20px}.panel-icon{width:44px;height:44px;border-radius:14px}.wizard-progress{gap:.45rem}.wizard-step{padding:.6rem .55rem;font-size:.7rem}.wizard-step span{width:22px;height:22px}.script-row{grid-template-columns:28px 1fr 1fr 28px}.script-row .script-scene{grid-column:2 / 4}.batch-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.batch-actions{justify-content:flex-start}.batch-actions .button{font-size:.72rem!important;padding:.55rem .7rem!important}.panel-heading-row{flex-direction:column}.multi-upload-zone{min-height:128px}}

.batch-failed{height:100%;display:grid;place-items:center;align-content:center;gap:.3rem;padding:1rem;text-align:center;color:#ffcf70;background:radial-gradient(circle at 50% 35%,rgba(255,207,112,.12),transparent 62%)}.batch-failed strong{color:#ffe6aa;font-size:.8rem}.batch-failed small{color:#a9a2a0;font-size:.66rem;line-height:1.4}

.resume-project-row{display:flex;gap:.65rem;align-items:center;margin:1rem 0}.resume-project-row .prompt-input{flex:1}.script-order-actions{display:flex;gap:.2rem;align-items:center}.script-order-actions button,.batch-card-footer button{display:inline-grid;place-items:center;width:28px;height:28px;padding:0;border:1px solid rgba(127,214,255,.18);border-radius:8px;background:rgba(8,27,50,.66);color:#a9dfff;cursor:pointer}.script-order-actions button:disabled,.batch-card-footer button:disabled{opacity:.3;cursor:not-allowed}.script-order-actions button:hover:not(:disabled),.batch-card-footer button:hover:not(:disabled){background:rgba(55,205,255,.18);color:#fff}
.upload-errors{margin:.8rem 0;padding:.8rem .9rem;border:1px solid rgba(255,161,111,.42);border-radius:14px;background:rgba(118,46,33,.18);color:#ffd5c3;font-size:.8rem;line-height:1.55}.upload-errors strong{display:block;color:#ffe3d5;margin-bottom:.3rem}.upload-errors ul{margin:0;padding-left:1.1rem}.upload-errors li+li{margin-top:.25rem}
@media(max-width:640px){.resume-project-row{align-items:stretch;flex-direction:column}.resume-project-row .small-button{width:100%}.script-order-actions{gap:.15rem}.script-order-actions button{width:24px;height:24px}}

````

### `client/src/lib/trpc.ts`

````typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

````

### `client/src/lib/utils.ts`

````typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

````

### `client/src/main.tsx`

````tsx
import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

````

### `client/src/pages/ComponentShowcase.tsx`

````tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/contexts/ThemeContext";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  AlertCircle,
  CalendarIcon,
  Check,
  Clock,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast as sonnerToast } from "sonner";
import { AIChatBox, type Message } from "@/components/AIChatBox";

export default function ComponentsShowcase() {
  const { theme, toggleTheme } = useTheme();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [datePickerDate, setDatePickerDate] = useState<Date>();
  const [selectedFruits, setSelectedFruits] = useState<string[]>([]);
  const [progress, setProgress] = useState(33);
  const [currentPage, setCurrentPage] = useState(2);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [dialogInput, setDialogInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // AI ChatBox demo state
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: "system", content: "You are a helpful assistant." },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleDialogSubmit = () => {
    console.log("Dialog submitted with value:", dialogInput);
    sonnerToast.success("Submitted successfully", {
      description: `Input: ${dialogInput}`,
    });
    setDialogInput("");
    setDialogOpen(false);
  };

  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleDialogSubmit();
    }
  };

  const handleChatSend = (content: string) => {
    // Add user message
    const newMessages: Message[] = [...chatMessages, { role: "user", content }];
    setChatMessages(newMessages);

    // Simulate AI response with delay
    setIsChatLoading(true);
    setTimeout(() => {
      const aiResponse: Message = {
        role: "assistant",
        content: `This is a **demo response**. In a real app, you would call a tRPC mutation here:\n\n\`\`\`typescript\nconst chatMutation = trpc.ai.chat.useMutation({\n  onSuccess: (response) => {\n    setChatMessages(prev => [...prev, {\n      role: "assistant",\n      content: response.choices[0].message.content\n    }]);\n  }\n});\n\nchatMutation.mutate({ messages: newMessages });\n\`\`\`\n\nYour message was: "${content}"`,
      };
      setChatMessages([...newMessages, aiResponse]);
      setIsChatLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container max-w-6xl mx-auto">
        <div className="space-y-2 justify-between flex">
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            Shadcn/ui Component Library
          </h2>
          <Button variant="outline" size="icon" onClick={toggleTheme}>
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="space-y-12">
          {/* Text Colors Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Text Colors</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Foreground (Default)
                      </p>
                      <p className="text-foreground text-lg">
                        Default text color for main content
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Muted Foreground
                      </p>
                      <p className="text-muted-foreground text-lg">
                        Muted text for secondary information
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Primary
                      </p>
                      <p className="text-primary text-lg font-medium">
                        Primary brand color text
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Secondary Foreground
                      </p>
                      <p className="text-secondary-foreground text-lg">
                        Secondary action text color
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Accent Foreground
                      </p>
                      <p className="text-accent-foreground text-lg">
                        Accent text for emphasis
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Destructive
                      </p>
                      <p className="text-destructive text-lg font-medium">
                        Error or destructive action text
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Card Foreground
                      </p>
                      <p className="text-card-foreground text-lg">
                        Text color on card backgrounds
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Popover Foreground
                      </p>
                      <p className="text-popover-foreground text-lg">
                        Text color in popovers
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Color Combinations Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Color Combinations</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-primary text-primary-foreground rounded-lg p-4">
                    <p className="font-medium mb-1">Primary</p>
                    <p className="text-sm opacity-90">
                      Primary background with foreground text
                    </p>
                  </div>
                  <div className="bg-secondary text-secondary-foreground rounded-lg p-4">
                    <p className="font-medium mb-1">Secondary</p>
                    <p className="text-sm opacity-90">
                      Secondary background with foreground text
                    </p>
                  </div>
                  <div className="bg-muted text-muted-foreground rounded-lg p-4">
                    <p className="font-medium mb-1">Muted</p>
                    <p className="text-sm opacity-90">
                      Muted background with foreground text
                    </p>
                  </div>
                  <div className="bg-accent text-accent-foreground rounded-lg p-4">
                    <p className="font-medium mb-1">Accent</p>
                    <p className="text-sm opacity-90">
                      Accent background with foreground text
                    </p>
                  </div>
                  <div className="bg-destructive text-destructive-foreground rounded-lg p-4">
                    <p className="font-medium mb-1">Destructive</p>
                    <p className="text-sm opacity-90">
                      Destructive background with foreground text
                    </p>
                  </div>
                  <div className="bg-card text-card-foreground rounded-lg p-4 border">
                    <p className="font-medium mb-1">Card</p>
                    <p className="text-sm opacity-90">
                      Card background with foreground text
                    </p>
                  </div>
                  <div className="bg-popover text-popover-foreground rounded-lg p-4 border">
                    <p className="font-medium mb-1">Popover</p>
                    <p className="text-sm opacity-90">
                      Popover background with foreground text
                    </p>
                  </div>
                  <div className="bg-background text-foreground rounded-lg p-4 border">
                    <p className="font-medium mb-1">Background</p>
                    <p className="text-sm opacity-90">
                      Default background with foreground text
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Buttons Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Buttons</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button size="sm">Small</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Form Inputs Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Form Inputs</h3>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your message here."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a fruit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apple">Apple</SelectItem>
                      <SelectItem value="banana">Banana</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">Accept terms and conditions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="airplane-mode" />
                  <Label htmlFor="airplane-mode">Airplane Mode</Label>
                </div>
                <div className="space-y-2">
                  <Label>Radio Group</Label>
                  <RadioGroup defaultValue="option-one">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option-one" id="option-one" />
                      <Label htmlFor="option-one">Option One</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option-two" id="option-two" />
                      <Label htmlFor="option-two">Option Two</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Slider</Label>
                  <Slider defaultValue={[50]} max={100} step={1} />
                </div>
                <div className="space-y-2">
                  <Label>Input OTP</Label>
                  <InputOTP maxLength={6}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="space-y-2">
                  <Label>Date Time Picker</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !datePickerDate && "text-muted-foreground"
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {datePickerDate ? (
                          format(datePickerDate, "PPP HH:mm", { locale: zhCN })
                        ) : (
                          <span>Select date and time</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3 space-y-3">
                        <Calendar
                          mode="single"
                          selected={datePickerDate}
                          onSelect={setDatePickerDate}
                        />
                        <div className="border-t pt-3 space-y-2">
                          <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Time
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={
                                datePickerDate
                                  ? format(datePickerDate, "HH:mm")
                                  : "00:00"
                              }
                              onChange={e => {
                                const [hours, minutes] =
                                  e.target.value.split(":");
                                const newDate = datePickerDate
                                  ? new Date(datePickerDate)
                                  : new Date();
                                newDate.setHours(parseInt(hours));
                                newDate.setMinutes(parseInt(minutes));
                                setDatePickerDate(newDate);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {datePickerDate && (
                    <p className="text-sm text-muted-foreground">
                      Selected:{" "}
                      {format(datePickerDate, "yyyy/MM/dd  HH:mm", {
                        locale: zhCN,
                      })}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Searchable Dropdown</Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full justify-between"
                      >
                        {selectedFramework
                          ? [
                              { value: "react", label: "React" },
                              { value: "vue", label: "Vue" },
                              { value: "angular", label: "Angular" },
                              { value: "svelte", label: "Svelte" },
                              { value: "nextjs", label: "Next.js" },
                              { value: "nuxt", label: "Nuxt" },
                              { value: "remix", label: "Remix" },
                            ].find(fw => fw.value === selectedFramework)?.label
                          : "Select framework..."}
                        <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search frameworks..." />
                        <CommandList>
                          <CommandEmpty>No framework found</CommandEmpty>
                          <CommandGroup>
                            {[
                              { value: "react", label: "React" },
                              { value: "vue", label: "Vue" },
                              { value: "angular", label: "Angular" },
                              { value: "svelte", label: "Svelte" },
                              { value: "nextjs", label: "Next.js" },
                              { value: "nuxt", label: "Nuxt" },
                              { value: "remix", label: "Remix" },
                            ].map(framework => (
                              <CommandItem
                                key={framework.value}
                                value={framework.value}
                                onSelect={currentValue => {
                                  setSelectedFramework(
                                    currentValue === selectedFramework
                                      ? ""
                                      : currentValue
                                  );
                                  setOpenCombobox(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedFramework === framework.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                {framework.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedFramework && (
                    <p className="text-sm text-muted-foreground">
                      Selected:{" "}
                      {
                        [
                          { value: "react", label: "React" },
                          { value: "vue", label: "Vue" },
                          { value: "angular", label: "Angular" },
                          { value: "svelte", label: "Svelte" },
                          { value: "nextjs", label: "Next.js" },
                          { value: "nuxt", label: "Nuxt" },
                          { value: "remix", label: "Remix" },
                        ].find(fw => fw.value === selectedFramework)?.label
                      }
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="month" className="text-sm font-medium">
                        Month
                      </Label>
                      <Select
                        value={selectedMonth}
                        onValueChange={setSelectedMonth}
                      >
                        <SelectTrigger id="month">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            month => (
                              <SelectItem
                                key={month}
                                value={month.toString().padStart(2, "0")}
                              >
                                {month.toString().padStart(2, "0")}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year" className="text-sm font-medium">
                        Year
                      </Label>
                      <Select
                        value={selectedYear}
                        onValueChange={setSelectedYear}
                      >
                        <SelectTrigger id="year">
                          <SelectValue placeholder="YYYY" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: 10 },
                            (_, i) => new Date().getFullYear() - 5 + i
                          ).map(year => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {selectedMonth && selectedYear && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedYear}/{selectedMonth}/
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Data Display Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Data Display</h3>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label>Badges</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="flex gap-4">
                    <Avatar>
                      <AvatarImage src="https://github.com/shadcn.png" />
                      <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>AB</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Progress</Label>
                  <Progress value={progress} />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setProgress(Math.max(0, progress - 10))}
                    >
                      -10
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setProgress(Math.min(100, progress + 10))}
                    >
                      +10
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Skeleton</Label>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Pagination</Label>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={e => {
                            e.preventDefault();
                            setCurrentPage(Math.max(1, currentPage - 1));
                          }}
                        />
                      </PaginationItem>
                      {[1, 2, 3, 4, 5].map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === page}
                            onClick={e => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={e => {
                            e.preventDefault();
                            setCurrentPage(Math.min(5, currentPage + 1));
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <p className="text-sm text-muted-foreground text-center">
                    Current page: {currentPage}
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Table</Label>
                  <Table>
                    <TableCaption>A list of your recent invoices.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">INV001</TableCell>
                        <TableCell>Paid</TableCell>
                        <TableCell>Credit Card</TableCell>
                        <TableCell className="text-right">$250.00</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">INV002</TableCell>
                        <TableCell>Pending</TableCell>
                        <TableCell>PayPal</TableCell>
                        <TableCell className="text-right">$150.00</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">INV003</TableCell>
                        <TableCell>Unpaid</TableCell>
                        <TableCell>Bank Transfer</TableCell>
                        <TableCell className="text-right">$350.00</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Menubar</Label>
                  <Menubar>
                    <MenubarMenu>
                      <MenubarTrigger>File</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem>New Tab</MenubarItem>
                        <MenubarItem>New Window</MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem>Share</MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem>Print</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger>Edit</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem>Undo</MenubarItem>
                        <MenubarItem>Redo</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger>View</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem>Reload</MenubarItem>
                        <MenubarItem>Force Reload</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                  </Menubar>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Breadcrumb</Label>
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/components">
                          Components
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Alerts Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Alerts</h3>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Heads up!</AlertTitle>
                <AlertDescription>
                  You can add components to your app using the cli.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Your session has expired. Please log in again.
                </AlertDescription>
              </Alert>
            </div>
          </section>

          {/* Tabs Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Tabs</h3>
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <CardDescription>
                      Make changes to your account here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" defaultValue="Pedro Duarte" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button>Save changes</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="password">
                <Card>
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>
                      Change your password here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="current">Current password</Label>
                      <Input id="current" type="password" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new">New password</Label>
                      <Input id="new" type="password" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button>Save password</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>
                      Manage your settings here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Settings content goes here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>

          {/* Accordion Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Accordion</h3>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                  Yes. It adheres to the WAI-ARIA design pattern.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>
                  Yes. It comes with default styles that matches the other
                  components' aesthetic.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Is it animated?</AccordionTrigger>
                <AccordionContent>
                  Yes. It's animated by default, but you can disable it if you
                  prefer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Collapsible Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Collapsible</h3>
            <Collapsible>
              <Card>
                <CardHeader>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <CardTitle>@peduarte starred 3 repositories</CardTitle>
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="rounded-md border px-4 py-3 font-mono text-sm">
                        @radix-ui/primitives
                      </div>
                      <div className="rounded-md border px-4 py-3 font-mono text-sm">
                        @radix-ui/colors
                      </div>
                      <div className="rounded-md border px-4 py-3 font-mono text-sm">
                        @stitches/react
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </section>

          {/* Dialog, Sheet, Drawer Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Overlays</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Test Input</DialogTitle>
                        <DialogDescription>
                          Enter some text below. Press Enter to submit (IME composition supported).
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="dialog-input">Input</Label>
                          <Input
                            id="dialog-input"
                            placeholder="Type something..."
                            value={dialogInput}
                            onChange={(e) => setDialogInput(e.target.value)}
                            onKeyDown={handleDialogKeyDown}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleDialogSubmit}>Submit</Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline">Open Sheet</Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Edit profile</SheetTitle>
                        <SheetDescription>
                          Make changes to your profile here. Click save when
                          you're done.
                        </SheetDescription>
                      </SheetHeader>
                    </SheetContent>
                  </Sheet>

                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button variant="outline">Open Drawer</Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                        <DrawerDescription>
                          This action cannot be undone.
                        </DrawerDescription>
                      </DrawerHeader>
                      <DrawerFooter>
                        <Button>Submit</Button>
                        <DrawerClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">Open Popover</Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Dimensions</h4>
                        <p className="text-sm text-muted-foreground">
                          Set the dimensions for the layer.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover me</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add to library</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Menus Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Menus</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">Dropdown Menu</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Profile</DropdownMenuItem>
                      <DropdownMenuItem>Billing</DropdownMenuItem>
                      <DropdownMenuItem>Team</DropdownMenuItem>
                      <DropdownMenuItem>Subscription</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <Button variant="outline">Right Click Me</Button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem>Profile</ContextMenuItem>
                      <ContextMenuItem>Billing</ContextMenuItem>
                      <ContextMenuItem>Team</ContextMenuItem>
                      <ContextMenuItem>Subscription</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>

                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button variant="outline">Hover Card</Button>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">@nextjs</h4>
                        <p className="text-sm">
                          The React Framework – created and maintained by
                          @vercel.
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Calendar Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Calendar</h3>
            <Card>
              <CardContent className="pt-6 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          </section>

          {/* Carousel Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Carousel</h3>
            <Card>
              <CardContent className="pt-6">
                <Carousel className="w-full max-w-xs mx-auto">
                  <CarouselContent>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <CarouselItem key={index}>
                        <div className="p-1">
                          <Card>
                            <CardContent className="flex aspect-square items-center justify-center p-6">
                              <span className="text-4xl font-semibold">
                                {index + 1}
                              </span>
                            </CardContent>
                          </Card>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </CardContent>
            </Card>
          </section>

          {/* Toggle Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Toggle</h3>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Toggle</Label>
                  <div className="flex gap-2">
                    <Toggle aria-label="Toggle italic">
                      <span className="font-bold">B</span>
                    </Toggle>
                    <Toggle aria-label="Toggle italic">
                      <span className="italic">I</span>
                    </Toggle>
                    <Toggle aria-label="Toggle underline">
                      <span className="underline">U</span>
                    </Toggle>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Toggle Group</Label>
                  <ToggleGroup type="multiple">
                    <ToggleGroupItem value="bold" aria-label="Toggle bold">
                      <span className="font-bold">B</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="italic" aria-label="Toggle italic">
                      <span className="italic">I</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="underline"
                      aria-label="Toggle underline"
                    >
                      <span className="underline">U</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Aspect Ratio & Scroll Area Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Layout Components</h3>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label>Aspect Ratio (16/9)</Label>
                  <AspectRatio ratio={16 / 9} className="bg-muted">
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">16:9 Aspect Ratio</p>
                    </div>
                  </AspectRatio>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Scroll Area</Label>
                  <ScrollArea className="h-[200px] w-full rounded-md border overflow-hidden">
                    <div className="p-4">
                      <div className="space-y-4">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} className="text-sm">
                            Item {i + 1}: This is a scrollable content area
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Resizable Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Resizable Panels</h3>
            <Card>
              <CardContent className="pt-6">
                <ResizablePanelGroup
                  direction="horizontal"
                  className="min-h-[200px] rounded-lg border"
                >
                  <ResizablePanel defaultSize={50}>
                    <div className="flex h-full items-center justify-center p-6">
                      <span className="font-semibold">Panel One</span>
                    </div>
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={50}>
                    <div className="flex h-full items-center justify-center p-6">
                      <span className="font-semibold">Panel Two</span>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </CardContent>
            </Card>
          </section>

          {/* Toast Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Toast</h3>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Sonner Toast</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        sonnerToast.success("Operation successful", {
                          description: "Your changes have been saved",
                        });
                      }}
                    >
                      Success
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        sonnerToast.error("Operation failed", {
                          description:
                            "Cannot complete operation, please try again",
                        });
                      }}
                    >
                      Error
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        sonnerToast.info("Information", {
                          description: "This is an information message",
                        });
                      }}
                    >
                      Info
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        sonnerToast.warning("Warning", {
                          description:
                            "Please note the impact of this operation",
                        });
                      }}
                    >
                      Warning
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        sonnerToast.loading("Loading", {
                          description: "Please wait",
                        });
                      }}
                    >
                      Loading
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const promise = new Promise(resolve =>
                          setTimeout(resolve, 2000)
                        );
                        sonnerToast.promise(promise, {
                          loading: "Processing...",
                          success: "Processing complete!",
                          error: "Processing failed",
                        });
                      }}
                    >
                      Promise
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* AI ChatBox Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">AI ChatBox</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>
                      A ready-to-use chat interface component that integrates with the LLM system.
                      Features markdown rendering, auto-scrolling, and loading states.
                    </p>
                    <p className="mt-2">
                      This is a demo with simulated responses. In a real app, you'd connect it to a tRPC mutation.
                    </p>
                  </div>
                  <AIChatBox
                    messages={chatMessages}
                    onSendMessage={handleChatSend}
                    isLoading={isChatLoading}
                    placeholder="Try sending a message..."
                    height="500px"
                    emptyStateMessage="How can I help you today?"
                    suggestedPrompts={[
                      "What is React?",
                      "Explain TypeScript",
                      "How to use tRPC?",
                      "Best practices for web development",
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <footer className="border-t py-6 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Shadcn/ui Component Showcase</p>
        </div>
      </footer>
    </div>
  );
}

````

### `client/src/pages/Home.tsx`

````tsx
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ClipboardCheck, Download, Image as ImageIcon, Menu, MessageCircle, Plus, RefreshCw, Share2, Sparkles, Upload, Wand2, X } from "lucide-react";

const logoUrl = "/manus-storage/sticker-tycoon-logo_d42e24d3.png";
const styles = [
  { id: "cute", label: "可愛手繪", icon: "✏️" },
  { id: "pop", label: "繽紛流行", icon: "🌈" },
  { id: "comic", label: "漫畫表情", icon: "💥" },
  { id: "minimal", label: "清爽極簡", icon: "◌" },
];
const phraseSeeds = [
  ["早安", "揮手打招呼，精神飽滿"], ["謝謝", "雙手合十，溫暖微笑"], ["收到", "敬禮或點頭，表情俐落"], ["加油", "握拳鼓勵，充滿活力"], ["等等我", "小跑步揮手，帶一點急迫感"], ["好累喔", "慵懶趴下，眼神疲憊"], ["太好了", "開心跳起來，周圍有小星星"], ["不要啦", "搖手拒絕，表情撒嬌"], ["晚安", "抱著枕頭打呵欠，氣氛療癒"], ["掰掰", "揮手道別，笑容可愛"],
];

type Reference = { url: string; fileName: string; dataUrl: string; mimeType: string };
type Script = { position: number; emotion: string; phrase: string; scene: string };
type Result = Script & { url: string; mode: "generate" | "cutout" | "refine"; hasAlpha?: boolean; error?: string; quality?: { transparent: boolean; dimensions: boolean | string; textReady: boolean; report?: { transparent: string; dimensions: string; text: string } } };
type Message = { role: "user" | "assistant"; content: string };

function scrollToId(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
function readFileAsDataUrl(file: Blob) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("圖片讀取失敗")); reader.readAsDataURL(file); }); }
function isHeic(file: File) { return file.type.toLowerCase().includes("heic") || /\.(heic|heif)$/i.test(file.name); }
const MAX_REFERENCE_FILE_BYTES = 12 * 1024 * 1024;
async function normalizeBrowserPhoto(file: File) {
  if (!isHeic(file)) return { blob: file as Blob, fileName: file.name, mimeType: file.type || "image/jpeg" };
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const jpeg = Array.isArray(converted) ? converted[0] : converted;
  if (!jpeg) throw new Error("HEIC 轉檔沒有產生圖片");
  return { blob: jpeg, fileName: file.name.replace(/\.(heic|heif)$/i, ".jpg"), mimeType: "image/jpeg" };
}
function defaultScripts(count: number): Script[] { return Array.from({ length: count }, (_, index) => { const seed = phraseSeeds[index % phraseSeeds.length]; return { position: index + 1, phrase: seed[0], emotion: seed[0], scene: seed[1] }; }); }

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState("把我的角色照片做成可愛、日常實用的卡通貼圖");
  const [projectTitle, setProjectTitle] = useState("我的專屬貼圖組");
  const [styleId, setStyleId] = useState("cute");
  const [stickerCount, setStickerCount] = useState(10);
  const [characterProfile, setCharacterProfile] = useState("");
  const [references, setReferences] = useState<Reference[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [scripts, setScripts] = useState<Script[]>(defaultScripts(10));
  const [results, setResults] = useState<Result[]>([]);
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [projectKey, setProjectKey] = useState(() => typeof window === "undefined" ? "" : window.localStorage.getItem("sticker-tycoon-project-key") || "");
  const [resumeKey, setResumeKey] = useState("");
  const [notice, setNotice] = useState("");
  const [batchProgress, setBatchProgress] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([{ role: "assistant", content: "你好！我會先幫你建立角色設定與貼圖方案，再逐張生成。你可以隨時告訴我想改哪一張。" }]);
  const savedResultsKey = projectKey ? `sticker-tycoon-results-${projectKey}` : "";

  const selectedStyle = styles.find((item) => item.id === styleId) ?? styles[0];
  const planMutation = trpc.project.plan.useMutation();
  const createMutation = trpc.project.create.useMutation();
  const prepareMutation = trpc.project.prepareReference.useMutation();
  const batchMutation = trpc.creative.generateBatch.useMutation();
  const refineMutation = trpc.creative.refine.useMutation();
  const qualityMutation = trpc.creative.qualityCheck.useMutation();
  const zipMutation = trpc.creative.exportZip.useMutation();
  const projectQuery = trpc.project.get.useQuery({ projectKey }, { enabled: Boolean(projectKey) });
  const busy = planMutation.isPending || createMutation.isPending || prepareMutation.isPending || batchMutation.isPending || refineMutation.isPending || qualityMutation.isPending || zipMutation.isPending;
  const readyCount = results.filter((item) => item.quality?.transparent && item.quality?.dimensions).length;
  const failedCount = results.filter((item) => Boolean(item.error)).length;
  const successfulCount = results.filter((item) => Boolean(item.url)).length;
  const selected = selectedResult === null ? null : results[selectedResult];
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 3600); };
  useEffect(() => { if (!projectKey || typeof window === "undefined") return; const raw = window.localStorage.getItem(`sticker-tycoon-results-${projectKey}`); if (raw) { try { setResults(JSON.parse(raw) as Result[]); setStep(4); } catch { window.localStorage.removeItem(`sticker-tycoon-results-${projectKey}`); } } }, [projectKey]);
  useEffect(() => { if (!projectQuery.data) return; setProjectTitle(projectQuery.data.project.title); setBrief(projectQuery.data.project.brief || ""); setCharacterProfile(projectQuery.data.project.characterProfile || ""); setScripts(projectQuery.data.scripts.map((item) => ({ position: item.position, emotion: item.emotion, phrase: item.phrase, scene: item.scene || "" }))); setStickerCount(projectQuery.data.project.stickerCount); setReferences(projectQuery.data.references.map((item) => ({ url: item.url, fileName: item.fileName, dataUrl: item.url, mimeType: "image/jpeg" }))); const recovered = projectQuery.data.scripts.filter((item) => item.resultUrl || item.errorMessage).map((item) => ({ position: item.position, emotion: item.emotion, phrase: item.phrase, scene: item.scene || "", url: item.resultUrl || "", mode: "generate" as const, hasAlpha: false, error: item.errorMessage || undefined, quality: item.qualityReport ? (() => { try { return JSON.parse(item.qualityReport) as Result["quality"]; } catch { return undefined; } })() : undefined })); if (recovered.length) { setResults(recovered); setStep(4); } }, [projectQuery.data]);
  useEffect(() => { if (projectQuery.error) showNotice("找不到此專案代碼，請確認後再試"); }, [projectQuery.error]);

  const handleReferences = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const errors: string[] = [];
    const files = selectedFiles.filter((file) => {
      const supported = file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
      if (!supported) { errors.push(`${file.name}：不支援的格式，請使用 JPG、PNG、WEBP、HEIC 或 HEIF。`); return false; }
      if (file.size > MAX_REFERENCE_FILE_BYTES) { errors.push(`${file.name}：檔案超過 12 MB，請壓縮或選擇較小照片。`); return false; }
      return true;
    });
    if (!files.length) { setUploadErrors(errors); event.target.value = ""; showNotice("沒有可處理的照片，請查看下方錯誤原因"); return; }
    const next: Reference[] = [];
    const available = Math.max(0, 10 - references.length);
    for (const file of files.slice(0, available)) {
      try {
        const normalized = await normalizeBrowserPhoto(file);
        const dataUrl = await readFileAsDataUrl(normalized.blob);
        const prepared = await prepareMutation.mutateAsync({ photoDataUrl: dataUrl, fileName: normalized.fileName });
        next.push({ url: prepared.url, fileName: prepared.fileName, dataUrl, mimeType: prepared.mimeType });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "無法轉換此照片";
        errors.push(`${file.name}：${detail.includes("HEIC") || isHeic(file) ? "HEIC 轉檔失敗，請改用 JPG 或重新選取原始照片" : detail}`);
      }
    }
    if (files.length > available) errors.push(`最多可加入 10 張照片，已略過 ${files.length - available} 張。`);
    setUploadErrors(errors);
    if (next.length) setReferences((current) => [...current, ...next].slice(0, 10));
    event.target.value = "";
    showNotice(next.length ? `已成功加入 ${next.length} 張角色參考照片${errors.length ? `；${errors.length} 張未加入` : ""}` : "沒有照片成功加入，請查看下方錯誤原因");
  };

  const planProject = async () => {
    try {
      const plan = await planMutation.mutateAsync({ brief, style: selectedStyle.label, stickerCount, characterProfile: characterProfile || undefined });
      setProjectTitle(plan.title || projectTitle);
      setCharacterProfile(plan.characterProfile || characterProfile);
      setScripts(plan.scripts.slice(0, stickerCount));
      setStep(2);
      setChatMessages((items) => [...items, { role: "assistant", content: plan.fallback ? (plan.fallbackMessage || "已建立可編輯的基礎貼圖腳本。") : `已完成「${plan.title}」方案，建立了 ${plan.scripts.length} 張貼圖腳本與角色設定。請檢查後繼續。` }]);
      showNotice(plan.fallback ? (plan.fallbackMessage || "已建立基礎貼圖腳本") : "AI 方案規劃完成");
    } catch (error) { showNotice(error instanceof Error ? error.message : "方案規劃失敗，請稍後重試"); }
  };

  const createProject = async () => {
    if (!references.length) { showNotice("請先上傳至少一張角色照片"); return; }
    try {
      const created = await createMutation.mutateAsync({ title: projectTitle, brief, style: selectedStyle.label, stickerCount, characterProfile, references: references.map((item, index) => ({ url: item.url, fileName: item.fileName, sortOrder: index })), scripts });
      setProjectKey(created.projectKey); window.localStorage.setItem("sticker-tycoon-project-key", created.projectKey);
      setStep(3);
      showNotice("貼圖專案已建立");
    } catch (error) { showNotice(error instanceof Error ? error.message : "專案建立失敗"); }
  };

  const generateBatch = async (onlyFailed = false) => {
    if (!references.length) { showNotice("請先上傳角色照片"); return; }
    const items = onlyFailed ? scripts.filter((script) => results.some((result) => result.error && result.position === script.position)) : scripts;
    if (!items.length) { showNotice("目前沒有需要重試的貼圖"); return; }
    setBatchProgress(8); setStep(4); if (!onlyFailed) { setResults([]); setSelectedResult(null); }
    try {
      const generated = await batchMutation.mutateAsync({ projectKey: projectKey || undefined, photoDataUrl: references[0].url, referenceUrls: references.map((item) => item.url), style: selectedStyle.label, characterProfile, items });
      const mapped: Result[] = generated.map((item) => ({ ...item, quality: undefined }));
      const merged = [...(onlyFailed ? results.filter((item) => !item.error) : []), ...mapped].sort((a, b) => a.position - b.position);
      setResults(merged);
      setBatchProgress(86);
      const checked: Result[] = [];
      for (const item of merged) {
        if (item.error || !item.url) { checked.push(item); continue; }
        try {
          const quality = await qualityMutation.mutateAsync({ url: item.url, phrase: item.phrase });
          checked.push({ ...item, quality });
        } catch { checked.push({ ...item, quality: { transparent: Boolean(item.hasAlpha), dimensions: "待人工確認", textReady: item.phrase.length > 0 } }); }
        setBatchProgress((current) => Math.min(99, current + Math.ceil(14 / Math.max(mapped.length, 1))));
      }
      setResults(checked); if (savedResultsKey) window.localStorage.setItem(savedResultsKey, JSON.stringify(checked)); setBatchProgress(100); const failedCount = checked.filter((item) => item.error).length; showNotice(failedCount ? `完成 ${checked.length - failedCount} 張，${failedCount} 張因 AI 使用量限制待重試` : `完成 ${checked.length} 張獨立貼圖，品質檢查也已完成`);
      setChatMessages((items) => [...items, { role: "assistant", content: `貼圖組生成完成！目前有 ${checked.length} 張獨立結果，你可以點選任一張進行對話修改。` }]);
    } catch (error) { setBatchProgress(0); showNotice(error instanceof Error ? error.message : "批次生成失敗，請檢查照片或稍後重試"); }
  };

  const updateScript = (index: number, patch: Partial<Script>) => setScripts((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const moveScript = (index: number, direction: -1 | 1) => setScripts((items) => { const target = index + direction; if (target < 0 || target >= items.length) return items; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next.map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })); });
  const moveResult = (index: number, direction: -1 | 1) => setResults((items) => { const target = index + direction; if (target < 0 || target >= items.length) return items; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; if (savedResultsKey && typeof window !== "undefined") window.localStorage.setItem(savedResultsKey, JSON.stringify(next)); setSelectedResult(null); return next; });
  const addScript = () => { if (scripts.length >= 40) return; const position = scripts.length + 1; setScripts((items) => [...items, { position, phrase: "新的貼圖", emotion: "日常", scene: "自然、有辨識度的角色動作" }]); setStickerCount(position); };
  const removeScript = (index: number) => { if (scripts.length <= 4) return; setScripts((items) => items.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, position: itemIndex + 1 }))); setStickerCount(Math.max(4, scripts.length - 1)); };

  const sendChat = async () => {
    const instruction = chatInput.trim(); if (!instruction) return;
    setChatInput(""); setChatMessages((items) => [...items, { role: "user", content: instruction }]);
    if (!selected) { setBrief((current) => `${current}；${instruction}`); setChatMessages((items) => [...items, { role: "assistant", content: "我已把這個要求加入專案方向。你可以繼續檢查方案，或開始生成。" }]); return; }
    if (!selected.url) { setChatMessages((items) => [...items, { role: "assistant", content: "這張貼圖尚未生成成功，請先按「重試失敗貼圖」或選擇已有完成結果的貼圖。" }]); showNotice("請先選擇已完成的貼圖"); return; }
    try {
      const response = await refineMutation.mutateAsync({ currentImageUrl: { url: selected.url, mimeType: "image/png" }, instruction, history: chatMessages });
      const next = response.unchanged ? selected : { ...selected, url: response.url, mode: "refine" as const };
      setResults((items) => items.map((item, index) => index === selectedResult ? next : item));
      setChatMessages((items) => [...items, { role: "assistant", content: response.reply || "已完成修改，新的版本已替換到目前貼圖。" }]);
      showNotice(response.unchanged ? "AI 修改服務使用量已暫時耗盡，原圖已保留" : "單張貼圖修改完成");
    } catch (error) { setChatMessages((items) => [...items, { role: "assistant", content: error instanceof Error ? error.message : "修改失敗，原本版本仍保留。" }]); showNotice("AI 修改失敗"); }
  };

  const retryFailed = () => { void generateBatch(true); };
  const triggerDownload = (href: string, fileName: string, revokeAfter = false) => { const link = document.createElement("a"); link.href = href; link.download = fileName; link.style.display = "none"; document.body.appendChild(link); link.click(); link.remove(); if (revokeAfter) window.setTimeout(() => URL.revokeObjectURL(href), 1_000); };
  const download = (item: Result, index: number) => { if (!item.url) { showNotice(item.error || "這張貼圖目前沒有可下載的結果"); return; } triggerDownload(item.url, `sticker-${String(index + 1).padStart(2, "0")}-${item.phrase}.png`); };
  const exportZip = async () => { try { const archive = await zipMutation.mutateAsync({ files: results.filter((item) => item.url).map((item, index) => ({ url: item.url, fileName: `sticker-${String(index + 1).padStart(2, "0")}-${item.phrase}.png` })) }); const binary = Uint8Array.from(atob(archive.base64), (char) => char.charCodeAt(0)); const blob = new Blob([binary], { type: "application/zip" }); triggerDownload(URL.createObjectURL(blob), archive.fileName, true); showNotice("ZIP 貼圖套件已準備完成"); } catch (error) { showNotice(error instanceof Error ? error.message : "ZIP 匯出失敗"); } };
  const share = async () => { const text = `我剛用 Sticker Tycoon 完成「${projectTitle}」貼圖組！`; if (navigator.share) await navigator.share({ title: projectTitle, text }); else { await navigator.clipboard?.writeText(text); showNotice("分享文字已複製"); } };

  const wizardSteps = ["需求對話", "角色設定", "文字腳本", "生成與檢查"];
  return <div className="site-shell">
    {notice && <div className="toast"><Sparkles size={16} />{notice}</div>}
    <header className="topbar"><a className="brand" href="#top"><img src={logoUrl} alt="貼圖大亨標誌" /><span><strong>貼圖大亨</strong><small>Sticker Tycoon</small></span></a><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="開啟導覽選單"><Menu size={22} /></button><nav className={menuOpen ? "nav-links open" : "nav-links"}><button onClick={() => { scrollToId("studio"); setMenuOpen(false); }}>開始製作</button><button onClick={() => { scrollToId("features"); setMenuOpen(false); }}>功能特色</button><button onClick={() => { scrollToId("guide"); setMenuOpen(false); }}>使用流程</button></nav><button className="button button-primary header-cta" onClick={() => scrollToId("studio")}><Wand2 size={15} />建立貼圖組</button></header>
    <main id="top">
      <section className="hero section-pad hero-simplified"><div className="ambient orb-one" /><div className="ambient orb-two" /><div className="hero-copy reveal"><div className="eyebrow">AI 貼圖專案工作室 · 從照片到整套素材</div><h1>把角色變成<br /><span>完整貼圖組</span></h1><p className="hero-lead">先聊需求、建立角色設定，再逐張生成、檢查、修改與匯出。所有步驟都留在同一個網頁。</p><div className="hero-actions"><button className="button button-primary" onClick={() => scrollToId("studio")}><Wand2 size={16} />開始建立專案</button><button className="button button-secondary" onClick={() => scrollToId("features")}><ClipboardCheck size={16} />查看完整能力</button></div><div className="trust-row"><span><Check size={14} />多張照片參考</span><span><Check size={14} />逐張品質檢查</span><span><Check size={14} />PNG 與 ZIP 匯出</span></div></div></section>
      <section id="studio" className="studio-section section-pad"><div className="section-heading"><div className="eyebrow">🪄 AI 貼圖組專案精靈</div><h2>從需求到交付，<span>每一步都可掌控</span></h2><p>這次不只生成一張圖，而是建立角色、腳本、批次結果與可下載的完整貼圖專案。</p></div>
        <div className="wizard-progress">{wizardSteps.map((item, index) => <div className={step === index + 1 ? "wizard-step active" : step > index + 1 ? "wizard-step complete" : "wizard-step"} key={item}><span>{step > index + 1 ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></div>)}</div>
        {step === 1 && <div className="wizard-panel"><div className="panel-icon">01</div><div className="wizard-form"><h3>先和 AI 說說你想做什麼</h3><p>例如：「用這些照片做 10 張可愛、日常實用的卡通貼圖，文字使用繁體中文。」</p><textarea className="prompt-input project-brief" value={brief} onChange={(event) => setBrief(event.target.value)} /><div className="resume-project-row"><input className="prompt-input" value={resumeKey} onChange={(event) => setResumeKey(event.target.value)} placeholder="已有專案代碼，例如：Ab3kL9mN2pQx" /><button className="button button-secondary small-button" onClick={() => { const key = resumeKey.trim(); if (!key) { showNotice("請輸入專案代碼"); return; } setProjectKey(key); window.localStorage.setItem("sticker-tycoon-project-key", key); showNotice("正在載入既有專案…"); }}>載入既有專案</button></div><div className="form-grid"><label>貼圖組名稱<input className="prompt-input" value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} /></label><label>視覺風格<select className="prompt-input" value={styleId} onChange={(event) => setStyleId(event.target.value)}>{styles.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.label}</option>)}</select></label><label>貼圖張數<select className="prompt-input" value={stickerCount} onChange={(event) => { const count = Number(event.target.value); setStickerCount(count); setScripts(defaultScripts(count)); }}>{[4, 8, 10, 16, 24, 32, 40].map((count) => <option key={count} value={count}>{count} 張獨立貼圖</option>)}</select></label></div><button className="button button-primary" onClick={planProject} disabled={busy}><Sparkles size={16} />{planMutation.isPending ? "AI 正在規劃…" : "讓 AI 規劃我的貼圖組"}<ArrowRight size={16} /></button></div></div>}
        {step === 2 && <div className="wizard-panel"><div className="panel-icon">02</div><div className="wizard-form"><div className="panel-heading-row"><div><h3>建立角色設定檔</h3><p>上傳 1–10 張照片。AI 會將它們視為同一個角色或角色組的參考。</p></div><span className="count-pill">{references.length}/10 張照片</span></div><button className="multi-upload-zone" onClick={() => fileRef.current?.click()} disabled={prepareMutation.isPending}><input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple onChange={handleReferences} hidden /><Upload size={28} /><strong>{prepareMutation.isPending ? "正在安全處理照片…" : "加入多張角色照片"}</strong><small>支援 JPG、PNG、WEBP、HEIC；HEIC 會先在裝置內轉成 JPEG 再上傳</small></button>{uploadErrors.length > 0 && <div className="upload-errors" role="alert"><strong>有 {uploadErrors.length} 張照片未加入</strong><ul>{uploadErrors.map((error) => <li key={error}>{error}</li>)}</ul></div>}{references.length > 0 && <div className="reference-strip">{references.map((reference, index) => <div className="reference-thumb" key={`${reference.fileName}-${index}`}><img src={reference.url} alt={reference.fileName} /><button onClick={() => setReferences((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`移除${reference.fileName}`}><X size={13} /></button><small>{index + 1}</small></div>)}</div>}<label>角色特徵補充<textarea className="prompt-input project-brief" value={characterProfile} onChange={(event) => setCharacterProfile(event.target.value)} placeholder="例如：白底咖啡斑、圓眼、耳朵偏長；請保留原本臉型與花色。" /></label><div className="wizard-actions"><button className="button button-secondary" onClick={() => setStep(1)}><ArrowLeft size={15} />上一步</button><button className="button button-primary" onClick={createProject} disabled={busy || !references.length}>建立角色與專案 <ArrowRight size={15} /></button></div></div></div>}
        {step === 3 && <div className="wizard-panel script-panel"><div className="panel-icon">03</div><div className="wizard-form"><div className="panel-heading-row"><div><h3>編輯文字與情境腳本</h3><p>每一列都是一張獨立貼圖。你可以調整文字、情緒與動作。</p></div><button className="button button-secondary small-button" onClick={addScript} disabled={scripts.length >= 40}><Plus size={14} />新增一張</button></div><div className="script-table">{scripts.map((script, index) => <div className="script-row" key={script.position}><span className="script-number">{String(index + 1).padStart(2, "0")}</span><input className="prompt-input" value={script.phrase} onChange={(event) => updateScript(index, { phrase: event.target.value })} aria-label="貼圖文字" /><input className="prompt-input" value={script.emotion} onChange={(event) => updateScript(index, { emotion: event.target.value })} aria-label="貼圖情緒" /><input className="prompt-input script-scene" value={script.scene} onChange={(event) => updateScript(index, { scene: event.target.value })} aria-label="貼圖情境" /><div className="script-order-actions"><button onClick={() => moveScript(index, -1)} disabled={index === 0} aria-label="腳本上移"><ArrowUp size={13} /></button><button onClick={() => moveScript(index, 1)} disabled={index === scripts.length - 1} aria-label="腳本下移"><ArrowDown size={13} /></button><button onClick={() => removeScript(index)} disabled={scripts.length <= 4} aria-label="移除腳本"><X size={13} /></button></div></div>)}</div><div className="wizard-actions"><button className="button button-secondary" onClick={() => setStep(2)}><ArrowLeft size={15} />上一步</button><button className="button button-primary" onClick={() => void generateBatch(false)} disabled={busy}>開始批次生成 <Sparkles size={15} /></button></div></div></div>}
        {step === 4 && <div className="batch-layout"><div className="batch-summary"><div className="batch-summary-top"><div><span className="eyebrow">{projectKey ? `專案 ${projectKey}` : "AI 貼圖生成"}</span><h3>{projectTitle}</h3></div><span className="count-pill">{successfulCount}/{scripts.length} 張完成</span></div><div className="batch-progress"><div style={{ width: `${batchProgress}%` }} /></div><p>{batchProgress === 100 ? failedCount ? `完成 ${readyCount} 張品質檢查，另有 ${failedCount} 張未完成；常見原因是 AI 服務使用量暫時耗盡。` : `完成 ${readyCount} 張品質檢查，可下載獨立 PNG 或 ZIP。` : batchProgress > 0 ? "AI 正在逐張生成，請保持頁面開啟…" : "準備開始生成。"}</p><div className="batch-actions"><button className="button button-secondary" onClick={() => setStep(3)}><ArrowLeft size={15} />回到腳本</button><button className="button button-secondary" onClick={() => void generateBatch(false)} disabled={busy}><RefreshCw size={15} />重新生成整組</button>{failedCount > 0 && <button className="button button-secondary" onClick={retryFailed} disabled={busy}><RefreshCw size={15} />重試失敗 {failedCount} 張</button>}{results.length > 0 && <button className="button button-secondary" onClick={share}><Share2 size={15} />分享</button>}{successfulCount > 0 && <button className="button button-primary" onClick={exportZip} disabled={zipMutation.isPending}><Archive size={15} />{zipMutation.isPending ? "打包中…" : "匯出 ZIP"}</button>}</div></div><div className="batch-grid">{results.length ? results.map((item, index) => <article className={selectedResult === index ? "batch-card selected" : "batch-card"} key={`${item.url}-${index}`} onClick={() => setSelectedResult(index)}><div className="batch-image-wrap">{item.url ? <img src={item.url} alt={`${item.phrase} 貼圖`} /> : <div className="batch-failed"><RefreshCw size={20} /><strong>暫未完成</strong><small>{item.error?.includes("usage exhausted") ? "AI 使用量已暫時耗盡" : "可稍後重試"}</small></div>}<span className="batch-index">{String(index + 1).padStart(2, "0")}</span></div><div className="batch-card-footer"><strong>{item.phrase}</strong><span className={item.quality?.transparent ? "quality-ok" : "quality-warn"}>{item.quality?.transparent ? "✓ 透明" : item.error ? "待重試" : "檢查"}</span><button onClick={(event) => { event.stopPropagation(); moveResult(index, -1); }} disabled={index === 0} aria-label="貼圖上移"><ArrowUp size={12} /></button><button onClick={(event) => { event.stopPropagation(); moveResult(index, 1); }} disabled={index === results.length - 1} aria-label="貼圖下移"><ArrowDown size={12} /></button><button onClick={(event) => { event.stopPropagation(); download(item, index); }} aria-label={`下載${item.phrase}`}><Download size={14} /></button></div></article>) : <div className="preview-placeholder"><ImageIcon size={32} /><strong>生成結果會出現在這裡</strong><span>按下開始批次生成，AI 會逐張建立獨立貼圖。</span></div>}</div></div>}
        <div className="chat-panel project-chat"><div className="chat-panel-heading"><div><span className="eyebrow"><MessageCircle size={14} /> AI 專案助手</span><h3>{selected ? `正在修改第 ${String((selectedResult ?? 0) + 1).padStart(2, "0")} 張：${selected.phrase}` : "用對話規劃與修改貼圖"}</h3></div>{busy && <RefreshCw size={18} className="spin" />}</div><div className="chat-messages">{chatMessages.slice(-6).map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "AI" : "你"}</span><p>{message.content}</p></div>)}</div><form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void sendChat(); }}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={selected ? "例如：第 3 張的文字改成早安，表情更開心" : "例如：增加一張「吃飽了嗎」的貼圖"} disabled={busy} /><button className="button button-primary" type="submit" disabled={busy || !chatInput.trim()}><ArrowRight size={16} /></button></form></div>
      </section>
      <section id="features" className="feature-section section-pad"><div className="section-heading"><div className="eyebrow">✨ 完整 AI 貼圖能力</div><h2>從一張照片，<span>整理成一套作品</span></h2><p>專案精靈、角色一致性、逐張品質檢查、對話修改與 ZIP 交付，全部集中在同一個網頁。</p></div><div className="feature-list"><article className="feature-item"><div className="feature-icon">✦</div><div><h3>需求對話與方案規劃</h3><p>先用自然語言說明角色、風格、張數與用途，AI 會建立角色設定與文字情境腳本。</p></div></article><article className="feature-item"><div className="feature-icon">◌</div><div><h3>角色一致性與多張參考</h3><p>使用多張照片建立角色參考，批次生成時持續注入角色特徵，降低每張風格漂移。</p></div></article><article className="feature-item"><div className="feature-icon">↻</div><div><h3>檢查、修改與匯出</h3><p>每張都是獨立結果，可檢查透明背景、點選後聊天修改，最後下載 PNG 或 ZIP 套件。</p></div></article></div></section>
      <section id="guide" className="guide-section section-pad"><div className="guide-panel"><div><div className="eyebrow">📖 新版使用流程</div><h2>四步驟，<br /><span>完成你的貼圖組</span></h2><p>先規劃，再生成；先確認角色，再批次製作。每一步都能回頭修改。</p></div><div className="steps">{[["01", "需求對話", "告訴 AI 角色、風格、張數與想傳達的情緒。"],["02", "角色設定", "上傳最多 10 張照片，建立角色一致性參考。"],["03", "文字腳本", "逐張編輯貼圖文字、情緒與情境。"],["04", "生成與交付", "逐張檢查、聊天修改，最後匯出 PNG 與 ZIP。"]].map(([n, t, d]) => <div className="step" key={n}><span>{n}</span><div><strong>{t}</strong><p>{d}</p></div></div>)}</div><button className="button button-primary" onClick={() => scrollToId("studio")}>建立貼圖專案 <ArrowRight size={16} /></button></div></section>
    </main><footer className="footer footer-minimal"><div className="footer-brand"><img src={logoUrl} alt="貼圖大亨標誌" /><div><strong>貼圖大亨</strong><small>Sticker Tycoon</small></div></div><p>從角色設定到 ZIP 交付，完成你的專屬貼圖組。</p></footer>
  </div>;
}

````

### `client/src/pages/NotFound.tsx`

````tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-red-500" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>

          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            Page Not Found
          </h2>

          <p className="text-slate-600 mb-8 leading-relaxed">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

````

### `components.json`

````json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "client/src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}

````

### `drizzle.config.ts`

````typescript
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});

````

### `drizzle/0000_puzzling_mandrill.sql`

````sql
CREATE TABLE `stickerProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectKey` varchar(64) NOT NULL,
	`title` varchar(160) NOT NULL,
	`brief` text,
	`characterProfile` text,
	`style` varchar(80) NOT NULL,
	`stickerCount` int NOT NULL DEFAULT 10,
	`status` enum('draft','generating','ready','error') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stickerProjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `stickerProjects_projectKey_unique` UNIQUE(`projectKey`)
);
--> statement-breakpoint
CREATE TABLE `stickerReferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`url` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stickerReferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickerScripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`position` int NOT NULL,
	`emotion` varchar(80) NOT NULL,
	`phrase` varchar(160) NOT NULL,
	`scene` text,
	`status` enum('draft','queued','generating','ready','error') NOT NULL DEFAULT 'draft',
	`resultUrl` text,
	`qualityReport` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stickerScripts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickerVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scriptId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`url` text NOT NULL,
	`mode` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stickerVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

````

### `drizzle/0001_shallow_mantis.sql`

````sql
ALTER TABLE `stickerScripts` ADD `errorMessage` text;
````

### `drizzle/meta/_journal.json`

````json
{
  "version": "7",
  "dialect": "mysql",
  "entries": [
    {
      "idx": 0,
      "version": "5",
      "when": 1787219242886,
      "tag": "0000_puzzling_mandrill",
      "breakpoints": true
    },
    {
      "idx": 1,
      "version": "5",
      "when": 1787220898586,
      "tag": "0001_shallow_mantis",
      "breakpoints": true
    }
  ]
}
````

### `drizzle/meta/0000_snapshot.json`

````json
{
  "version": "5",
  "dialect": "mysql",
  "id": "7f3817db-5d85-4d81-a8c0-788633d31e61",
  "prevId": "00000000-0000-0000-0000-000000000000",
  "tables": {
    "stickerProjects": {
      "name": "stickerProjects",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "projectKey": {
          "name": "projectKey",
          "type": "varchar(64)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "title": {
          "name": "title",
          "type": "varchar(160)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "brief": {
          "name": "brief",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "characterProfile": {
          "name": "characterProfile",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "style": {
          "name": "style",
          "type": "varchar(80)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "stickerCount": {
          "name": "stickerCount",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": 10
        },
        "status": {
          "name": "status",
          "type": "enum('draft','generating','ready','error')",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "'draft'"
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        },
        "updatedAt": {
          "name": "updatedAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "onUpdate": true,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "stickerProjects_id": {
          "name": "stickerProjects_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {
        "stickerProjects_projectKey_unique": {
          "name": "stickerProjects_projectKey_unique",
          "columns": [
            "projectKey"
          ]
        }
      },
      "checkConstraint": {}
    },
    "stickerReferences": {
      "name": "stickerReferences",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "projectId": {
          "name": "projectId",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "url": {
          "name": "url",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "fileName": {
          "name": "fileName",
          "type": "varchar(255)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "sortOrder": {
          "name": "sortOrder",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": 0
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "stickerReferences_id": {
          "name": "stickerReferences_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {},
      "checkConstraint": {}
    },
    "stickerScripts": {
      "name": "stickerScripts",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "projectId": {
          "name": "projectId",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "position": {
          "name": "position",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "emotion": {
          "name": "emotion",
          "type": "varchar(80)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "phrase": {
          "name": "phrase",
          "type": "varchar(160)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "scene": {
          "name": "scene",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "status": {
          "name": "status",
          "type": "enum('draft','queued','generating','ready','error')",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "'draft'"
        },
        "resultUrl": {
          "name": "resultUrl",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "qualityReport": {
          "name": "qualityReport",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "updatedAt": {
          "name": "updatedAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "onUpdate": true,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "stickerScripts_id": {
          "name": "stickerScripts_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {},
      "checkConstraint": {}
    },
    "stickerVersions": {
      "name": "stickerVersions",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "scriptId": {
          "name": "scriptId",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "version": {
          "name": "version",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": 1
        },
        "url": {
          "name": "url",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "mode": {
          "name": "mode",
          "type": "varchar(40)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "stickerVersions_id": {
          "name": "stickerVersions_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {},
      "checkConstraint": {}
    },
    "users": {
      "name": "users",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "openId": {
          "name": "openId",
          "type": "varchar(64)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "name": {
          "name": "name",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "email": {
          "name": "email",
          "type": "varchar(320)",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "loginMethod": {
          "name": "loginMethod",
          "type": "varchar(64)",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "role": {
          "name": "role",
          "type": "enum('user','admin')",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "'user'"
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        },
        "updatedAt": {
          "name": "updatedAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "onUpdate": true,
          "default": "(now())"
        },
        "lastSignedIn": {
          "name": "lastSignedIn",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "users_id": {
          "name": "users_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {
        "users_openId_unique": {
          "name": "users_openId_unique",
          "columns": [
            "openId"
          ]
        }
      },
      "checkConstraint": {}
    }
  },
  "views": {},
  "_meta": {
    "schemas": {},
    "tables": {},
    "columns": {}
  },
  "internal": {
    "tables": {},
    "indexes": {}
  }
}
````

### `drizzle/meta/0001_snapshot.json`

````json
{
  "version": "5",
  "dialect": "mysql",
  "id": "1a04a67a-93d4-422d-9490-20da27fa4172",
  "prevId": "7f3817db-5d85-4d81-a8c0-788633d31e61",
  "tables": {
    "stickerProjects": {
      "name": "stickerProjects",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "projectKey": {
          "name": "projectKey",
          "type": "varchar(64)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "title": {
          "name": "title",
          "type": "varchar(160)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "brief": {
          "name": "brief",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "characterProfile": {
          "name": "characterProfile",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "style": {
          "name": "style",
          "type": "varchar(80)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "stickerCount": {
          "name": "stickerCount",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": 10
        },
        "status": {
          "name": "status",
          "type": "enum('draft','generating','ready','error')",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "'draft'"
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        },
        "updatedAt": {
          "name": "updatedAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "onUpdate": true,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "stickerProjects_id": {
          "name": "stickerProjects_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {
        "stickerProjects_projectKey_unique": {
          "name": "stickerProjects_projectKey_unique",
          "columns": [
            "projectKey"
          ]
        }
      },
      "checkConstraint": {}
    },
    "stickerReferences": {
      "name": "stickerReferences",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "projectId": {
          "name": "projectId",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "url": {
          "name": "url",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "fileName": {
          "name": "fileName",
          "type": "varchar(255)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "sortOrder": {
          "name": "sortOrder",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": 0
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "stickerReferences_id": {
          "name": "stickerReferences_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {},
      "checkConstraint": {}
    },
    "stickerScripts": {
      "name": "stickerScripts",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "projectId": {
          "name": "projectId",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "position": {
          "name": "position",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "emotion": {
          "name": "emotion",
          "type": "varchar(80)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "phrase": {
          "name": "phrase",
          "type": "varchar(160)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "scene": {
          "name": "scene",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "status": {
          "name": "status",
          "type": "enum('draft','queued','generating','ready','error')",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "'draft'"
        },
        "resultUrl": {
          "name": "resultUrl",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "errorMessage": {
          "name": "errorMessage",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "qualityReport": {
          "name": "qualityReport",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "updatedAt": {
          "name": "updatedAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "onUpdate": true,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "stickerScripts_id": {
          "name": "stickerScripts_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {},
      "checkConstraint": {}
    },
    "stickerVersions": {
      "name": "stickerVersions",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "scriptId": {
          "name": "scriptId",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "version": {
          "name": "version",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": 1
        },
        "url": {
          "name": "url",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "mode": {
          "name": "mode",
          "type": "varchar(40)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "stickerVersions_id": {
          "name": "stickerVersions_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {},
      "checkConstraint": {}
    },
    "users": {
      "name": "users",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "openId": {
          "name": "openId",
          "type": "varchar(64)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "name": {
          "name": "name",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "email": {
          "name": "email",
          "type": "varchar(320)",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "loginMethod": {
          "name": "loginMethod",
          "type": "varchar(64)",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "role": {
          "name": "role",
          "type": "enum('user','admin')",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "'user'"
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        },
        "updatedAt": {
          "name": "updatedAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "onUpdate": true,
          "default": "(now())"
        },
        "lastSignedIn": {
          "name": "lastSignedIn",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "users_id": {
          "name": "users_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {
        "users_openId_unique": {
          "name": "users_openId_unique",
          "columns": [
            "openId"
          ]
        }
      },
      "checkConstraint": {}
    }
  },
  "views": {},
  "_meta": {
    "schemas": {},
    "tables": {},
    "columns": {}
  },
  "internal": {
    "tables": {},
    "indexes": {}
  }
}
````

### `drizzle/relations.ts`

````typescript
import {} from "./schema";

````

### `drizzle/schema.ts`

````typescript
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const stickerProjects = mysqlTable("stickerProjects", {
  id: int("id").autoincrement().primaryKey(),
  projectKey: varchar("projectKey", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 160 }).notNull(),
  brief: text("brief"),
  characterProfile: text("characterProfile"),
  style: varchar("style", { length: 80 }).notNull(),
  stickerCount: int("stickerCount").notNull().default(10),
  status: mysqlEnum("status", ["draft", "generating", "ready", "error"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stickerReferences = mysqlTable("stickerReferences", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  url: text("url").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const stickerScripts = mysqlTable("stickerScripts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  position: int("position").notNull(),
  emotion: varchar("emotion", { length: 80 }).notNull(),
  phrase: varchar("phrase", { length: 160 }).notNull(),
  scene: text("scene"),
  status: mysqlEnum("status", ["draft", "queued", "generating", "ready", "error"]).notNull().default("draft"),
  resultUrl: text("resultUrl"),
  errorMessage: text("errorMessage"),
  qualityReport: text("qualityReport"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stickerVersions = mysqlTable("stickerVersions", {
  id: int("id").autoincrement().primaryKey(),
  scriptId: int("scriptId").notNull(),
  version: int("version").notNull().default(1),
  url: text("url").notNull(),
  mode: varchar("mode", { length: 40 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StickerProject = typeof stickerProjects.$inferSelect;
export type InsertStickerProject = typeof stickerProjects.$inferInsert;
export type StickerReference = typeof stickerReferences.$inferSelect;
export type StickerScript = typeof stickerScripts.$inferSelect;
export type StickerVersion = typeof stickerVersions.$inferSelect;

````

### `generated-10-stickers.json`

````json
{
  "referenceUrls": [
    "/manus-storage/1000027555_64d55c91.jpg",
    "/manus-storage/1000027557_f8da6ae6.jpg",
    "/manus-storage/1000027558_90ed979a.jpg",
    "/manus-storage/1000027559_2b5bc670.jpg",
    "/manus-storage/1000027691_f4580032.jpg",
    "/manus-storage/1000027865_60991973.jpg",
    "/manus-storage/1000027866_cd154718.jpg",
    "/manus-storage/1000027867_bd7a8d96.jpg",
    "/manus-storage/1000027868_db10ac35.jpg",
    "/manus-storage/1000027869_a1abfd98.jpg"
  ],
  "results": [
    {
      "position": 1,
      "emotion": "早安",
      "phrase": "早安",
      "scene": "開心揮手打招呼，晨光與小星星",
      "url": "/manus-storage/generated/sticker-1787220275830-rqn3zN_c1a1b85b.png",
      "hasAlpha": true,
      "mode": "generate",
      "quality": {
        "transparent": true,
        "phrase": "早安",
        "dimensions": "檢查完成",
        "textReady": true
      }
    },
    {
      "position": 2,
      "emotion": "謝謝",
      "phrase": "謝謝",
      "scene": "雙手合十，溫暖微笑",
      "url": "/manus-storage/generated/sticker-1787220283252-EM9C5v_e41add83.png",
      "hasAlpha": true,
      "mode": "generate",
      "quality": {
        "transparent": true,
        "phrase": "謝謝",
        "dimensions": "檢查完成",
        "textReady": true
      }
    },
    {
      "position": 3,
      "emotion": "收到",
      "phrase": "收到",
      "scene": "俐落點頭或敬禮，表示已收到",
      "url": "/manus-storage/generated/sticker-1787220346144-C3xCXV_3686b727.png",
      "hasAlpha": true,
      "mode": "generate",
      "quality": {
        "transparent": true,
        "phrase": "收到",
        "dimensions": "檢查完成",
        "textReady": true
      }
    },
    {
      "position": 4,
      "emotion": "加油",
      "phrase": "加油",
      "scene": "握拳鼓勵，充滿活力",
      "url": "/manus-storage/generated/sticker-1787220359767-6BDmbV_389f0d2b.png",
      "hasAlpha": true,
      "mode": "generate",
      "quality": {
        "transparent": true,
        "phrase": "加油",
        "dimensions": "檢查完成",
        "textReady": true
      }
    },
    {
      "position": 5,
      "emotion": "等等我",
      "phrase": "等等我",
      "scene": "小跑步揮手，帶一點急迫感",
      "url": "",
      "mode": "generate",
      "hasAlpha": false,
      "error": "Image generation request failed (400 Bad Request): {\"code\":\"failed_precondition\",\"message\":\"your account has hit a usage exhausted\"}"
    },
    {
      "position": 6,
      "emotion": "好累喔",
      "phrase": "好累喔",
      "scene": "慵懶趴下，眼神疲憊但可愛",
      "url": "/manus-storage/generated/sticker-1787220421691-gjYIlR_c27a4c70.png",
      "hasAlpha": true,
      "mode": "generate",
      "quality": {
        "transparent": true,
        "phrase": "好累喔",
        "dimensions": "檢查完成",
        "textReady": true
      }
    },
    {
      "position": 7,
      "emotion": "太好了",
      "phrase": "太好了",
      "scene": "開心跳起來，周圍有彩色星星",
      "url": "",
      "mode": "generate",
      "hasAlpha": false,
      "error": "Image generation request failed (400 Bad Request): {\"code\":\"failed_precondition\",\"message\":\"your account has hit a usage exhausted\"}"
    },
    {
      "position": 8,
      "emotion": "不要啦",
      "phrase": "不要啦",
      "scene": "搖手拒絕，表情撒嬌",
      "url": "",
      "mode": "generate",
      "hasAlpha": false,
      "error": "Image generation request failed (400 Bad Request): {\"code\":\"failed_precondition\",\"message\":\"your account has hit a usage exhausted\"}"
    },
    {
      "position": 9,
      "emotion": "晚安",
      "phrase": "晚安",
      "scene": "抱著枕頭打呵欠，月亮與星星",
      "url": "",
      "mode": "generate",
      "hasAlpha": false,
      "error": "Image generation request failed (400 Bad Request): {\"code\":\"failed_precondition\",\"message\":\"your account has hit a usage exhausted\"}"
    },
    {
      "position": 10,
      "emotion": "掰掰",
      "phrase": "掰掰",
      "scene": "揮手道別，笑容可愛",
      "url": "",
      "mode": "generate",
      "hasAlpha": false,
      "error": "Image generation request failed (400 Bad Request): {\"code\":\"failed_precondition\",\"message\":\"your account has hit a usage exhausted\"}"
    }
  ]
}
````

### `heic-regression-findings.md`

````markdown
# HEIC 上傳與流程回歸結果

原始五張 iPhone HEIC 在伺服器端 `sharp/libheif` 解碼時觸發 `ipma box` 安全限制，因此舊流程會把未轉換的 HEIC data URL 當成備援參考，造成後續服務錯誤。

修正後，前端會在裝置端動態載入 HEIC 轉檔器並先轉為 JPEG，再送到既有的安全儲存流程；不支援格式、超過 12 MB 的檔案與單張轉換失敗都會在工作區逐張列出原因。

以 Chromium 手機視窗實際上傳使用者提供的 5 張 HEIC：5 張皆成功加入、沒有上傳錯誤或瀏覽器 console error。相同回歸亦驗證過大檔案提示、腳本排序、使用量限制下的批次失敗卡片與 ZIP 防呆、以及 projectKey 載入後恢復 4 張失敗貼圖。

目前外部 AI 文字與圖像服務回傳 `usage exhausted`；網站已改為立即使用可編輯基礎腳本並保存貼圖失敗狀態，讓使用者可待額度恢復後只重試失敗項目。

````

### `package.json`

````json
{
  "name": "sticker-tycoon-replica",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
    "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest run",
    "db:push": "drizzle-kit generate && drizzle-kit migrate"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.693.0",
    "@aws-sdk/s3-request-presigner": "^3.693.0",
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-menubar": "^1.1.16",
    "@radix-ui/react-navigation-menu": "^1.2.14",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@tanstack/react-query": "^5.90.2",
    "@trpc/client": "^11.6.0",
    "@trpc/react-query": "^11.6.0",
    "@trpc/server": "^11.6.0",
    "axios": "^1.12.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "cookie": "^1.0.2",
    "date-fns": "^4.1.0",
    "dotenv": "^17.2.2",
    "drizzle-orm": "^0.44.5",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "framer-motion": "^12.23.22",
    "heic2any": "^0.0.4",
    "input-otp": "^1.4.2",
    "jose": "6.1.0",
    "jszip": "^3.10.1",
    "lucide-react": "^0.453.0",
    "mysql2": "^3.15.0",
    "nanoid": "^5.1.5",
    "next-themes": "^0.4.6",
    "pngjs": "^7.0.0",
    "react": "^19.2.1",
    "react-day-picker": "^9.11.1",
    "react-dom": "^19.2.1",
    "react-hook-form": "^7.64.0",
    "react-resizable-panels": "^3.0.6",
    "recharts": "^2.15.2",
    "sharp": "^0.35.3",
    "sonner": "^2.0.7",
    "streamdown": "^1.4.0",
    "superjson": "^1.13.3",
    "tailwind-merge": "^3.3.1",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@builder.io/vite-plugin-jsx-loc": "^0.1.1",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.3",
    "@types/express": "4.17.21",
    "@types/google.maps": "^3.58.1",
    "@types/jszip": "^3.4.1",
    "@types/node": "^24.7.0",
    "@types/pngjs": "^6.0.5",
    "@types/react": "^19.2.1",
    "@types/react-dom": "^19.2.1",
    "@vitejs/plugin-react": "^5.0.4",
    "add": "^2.0.6",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.31.4",
    "esbuild": "^0.25.0",
    "playwright-core": "^1.62.1",
    "pnpm": "^10.15.1",
    "postcss": "^8.4.47",
    "prettier": "^3.6.2",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.19.1",
    "tw-animate-css": "^1.4.0",
    "typescript": "5.9.3",
    "vite": "^7.1.7",
    "vite-plugin-manus-runtime": "0.0.59",
    "vitest": "^2.1.4"
  },
  "packageManager": "pnpm@10.4.1+sha512.c753b6c3ad7afa13af388fa6d808035a008e30ea9993f58c6663e2bc5ff21679aa834db094987129aa4d488b86df57f7b634981b2f827cdcacc698cc0cfb88af",
  "pnpm": {
    "patchedDependencies": {
      "wouter@3.7.1": "patches/wouter@3.7.1.patch"
    },
    "overrides": {
      "tailwindcss>nanoid": "3.3.7"
    }
  }
}

````

### `patches/wouter@3.7.1.patch`

````diff
diff --git a/esm/index.js b/esm/index.js
index c83bc63a2c10431fb62e25b7d490656a3796f301..bcae513cc20a4be6c38dc116e0b8d9bacda62b5b 100644
--- a/esm/index.js
+++ b/esm/index.js
@@ -338,6 +338,23 @@ const Switch = ({ children, location }) => {
   const router = useRouter();
   const [originalLocation] = useLocationFromRouter(router);
 
+  // Collect all route paths to window object
+  if (typeof window !== 'undefined') {
+    if (!window.__WOUTER_ROUTES__) {
+      window.__WOUTER_ROUTES__ = [];
+    }
+
+    const allChildren = flattenChildren(children);
+    allChildren.forEach((element) => {
+      if (isValidElement(element) && element.props.path) {
+        const path = element.props.path;
+        if (!window.__WOUTER_ROUTES__.includes(path)) {
+          window.__WOUTER_ROUTES__.push(path);
+        }
+      }
+    });
+  }
+
   for (const element of flattenChildren(children)) {
     let match = 0;
 

````

### `pnpm-lock.yaml`

````text
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

overrides:
  tailwindcss>nanoid: 3.3.7

patchedDependencies:
  wouter@3.7.1:
    hash: 4e16e6ff3fde7d6c1024d3e0c8605dc9eb6afb690d0d49958c2f449091813072
    path: patches/wouter@3.7.1.patch

importers:

  .:
    dependencies:
      '@aws-sdk/client-s3':
        specifier: ^3.693.0
        version: 3.1114.0
      '@aws-sdk/s3-request-presigner':
        specifier: ^3.693.0
        version: 3.1114.0
      '@hookform/resolvers':
        specifier: ^5.2.2
        version: 5.2.2(react-hook-form@7.64.0(react@19.2.1))
      '@radix-ui/react-accordion':
        specifier: ^1.2.12
        version: 1.2.12(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-alert-dialog':
        specifier: ^1.1.15
        version: 1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-aspect-ratio':
        specifier: ^1.1.7
        version: 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-avatar':
        specifier: ^1.1.10
        version: 1.1.10(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-checkbox':
        specifier: ^1.3.3
        version: 1.3.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-collapsible':
        specifier: ^1.1.12
        version: 1.1.12(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-context-menu':
        specifier: ^2.2.16
        version: 2.2.16(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-dialog':
        specifier: ^1.1.15
        version: 1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-dropdown-menu':
        specifier: ^2.1.16
        version: 2.1.16(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-hover-card':
        specifier: ^1.1.15
        version: 1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-label':
        specifier: ^2.1.7
        version: 2.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-menubar':
        specifier: ^1.1.16
        version: 1.1.16(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-navigation-menu':
        specifier: ^1.2.14
        version: 1.2.14(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-popover':
        specifier: ^1.1.15
        version: 1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-progress':
        specifier: ^1.1.7
        version: 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-radio-group':
        specifier: ^1.3.8
        version: 1.3.8(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-scroll-area':
        specifier: ^1.2.10
        version: 1.2.10(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-select':
        specifier: ^2.2.6
        version: 2.2.6(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-separator':
        specifier: ^1.1.7
        version: 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-slider':
        specifier: ^1.3.6
        version: 1.3.6(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-slot':
        specifier: ^1.2.3
        version: 1.2.3(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-switch':
        specifier: ^1.2.6
        version: 1.2.6(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-tabs':
        specifier: ^1.1.13
        version: 1.1.13(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-toggle':
        specifier: ^1.1.10
        version: 1.1.10(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-toggle-group':
        specifier: ^1.1.11
        version: 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-tooltip':
        specifier: ^1.2.8
        version: 1.2.8(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@tanstack/react-query':
        specifier: ^5.90.2
        version: 5.101.4(react@19.2.1)
      '@trpc/client':
        specifier: ^11.6.0
        version: 11.18.0(@trpc/server@11.18.0(typescript@5.9.3))(typescript@5.9.3)
      '@trpc/react-query':
        specifier: ^11.6.0
        version: 11.18.0(@tanstack/react-query@5.101.4(react@19.2.1))(@trpc/client@11.18.0(@trpc/server@11.18.0(typescript@5.9.3))(typescript@5.9.3))(@trpc/server@11.18.0(typescript@5.9.3))(react@19.2.1)(typescript@5.9.3)
      '@trpc/server':
        specifier: ^11.6.0
        version: 11.18.0(typescript@5.9.3)
      axios:
        specifier: ^1.12.0
        version: 1.12.2
      class-variance-authority:
        specifier: ^0.7.1
        version: 0.7.1
      clsx:
        specifier: ^2.1.1
        version: 2.1.1
      cmdk:
        specifier: ^1.1.1
        version: 1.1.1(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      cookie:
        specifier: ^1.0.2
        version: 1.1.1
      date-fns:
        specifier: ^4.1.0
        version: 4.1.0
      dotenv:
        specifier: ^17.2.2
        version: 17.4.2
      drizzle-orm:
        specifier: ^0.44.5
        version: 0.44.7(mysql2@3.23.4(@types/node@24.7.0))
      embla-carousel-react:
        specifier: ^8.6.0
        version: 8.6.0(react@19.2.1)
      express:
        specifier: ^4.21.2
        version: 4.21.2
      framer-motion:
        specifier: ^12.23.22
        version: 12.23.22(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      heic2any:
        specifier: ^0.0.4
        version: 0.0.4
      input-otp:
        specifier: ^1.4.2
        version: 1.4.2(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      jose:
        specifier: 6.1.0
        version: 6.1.0
      jszip:
        specifier: ^3.10.1
        version: 3.10.1
      lucide-react:
        specifier: ^0.453.0
        version: 0.453.0(react@19.2.1)
      mysql2:
        specifier: ^3.15.0
        version: 3.23.4(@types/node@24.7.0)
      nanoid:
        specifier: ^5.1.5
        version: 5.1.6
      next-themes:
        specifier: ^0.4.6
        version: 0.4.6(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      pngjs:
        specifier: ^7.0.0
        version: 7.0.0
      react:
        specifier: ^19.2.1
        version: 19.2.1
      react-day-picker:
        specifier: ^9.11.1
        version: 9.11.1(react@19.2.1)
      react-dom:
        specifier: ^19.2.1
        version: 19.2.1(react@19.2.1)
      react-hook-form:
        specifier: ^7.64.0
        version: 7.64.0(react@19.2.1)
      react-resizable-panels:
        specifier: ^3.0.6
        version: 3.0.6(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      recharts:
        specifier: ^2.15.2
        version: 2.15.4(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      sharp:
        specifier: ^0.35.3
        version: 0.35.3(@types/node@24.7.0)
      sonner:
        specifier: ^2.0.7
        version: 2.0.7(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      streamdown:
        specifier: ^1.4.0
        version: 1.4.0(@types/react@19.2.1)(react@19.2.1)
      superjson:
        specifier: ^1.13.3
        version: 1.13.3
      tailwind-merge:
        specifier: ^3.3.1
        version: 3.3.1
      tailwindcss-animate:
        specifier: ^1.0.7
        version: 1.0.7(tailwindcss@4.1.14)
      vaul:
        specifier: ^1.1.2
        version: 1.1.2(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      wouter:
        specifier: ^3.3.5
        version: 3.7.1(patch_hash=4e16e6ff3fde7d6c1024d3e0c8605dc9eb6afb690d0d49958c2f449091813072)(react@19.2.1)
      zod:
        specifier: ^4.1.12
        version: 4.1.12
    devDependencies:
      '@builder.io/vite-plugin-jsx-loc':
        specifier: ^0.1.1
        version: 0.1.1(vite@7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6))
      '@tailwindcss/typography':
        specifier: ^0.5.15
        version: 0.5.19(tailwindcss@4.1.14)
      '@tailwindcss/vite':
        specifier: ^4.1.3
        version: 4.1.14(vite@7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6))
      '@types/express':
        specifier: 4.17.21
        version: 4.17.21
      '@types/google.maps':
        specifier: ^3.58.1
        version: 3.58.1
      '@types/jszip':
        specifier: ^3.4.1
        version: 3.4.1
      '@types/node':
        specifier: ^24.7.0
        version: 24.7.0
      '@types/pngjs':
        specifier: ^6.0.5
        version: 6.0.5
      '@types/react':
        specifier: ^19.2.1
        version: 19.2.1
      '@types/react-dom':
        specifier: ^19.2.1
        version: 19.2.1(@types/react@19.2.1)
      '@vitejs/plugin-react':
        specifier: ^5.0.4
        version: 5.0.4(vite@7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6))
      add:
        specifier: ^2.0.6
        version: 2.0.6
      autoprefixer:
        specifier: ^10.4.20
        version: 10.4.21(postcss@8.5.6)
      drizzle-kit:
        specifier: ^0.31.4
        version: 0.31.10
      esbuild:
        specifier: ^0.25.0
        version: 0.25.10
      playwright-core:
        specifier: ^1.62.1
        version: 1.62.1
      pnpm:
        specifier: ^10.15.1
        version: 10.18.1
      postcss:
        specifier: ^8.4.47
        version: 8.5.6
      prettier:
        specifier: ^3.6.2
        version: 3.6.2
      tailwindcss:
        specifier: ^4.1.14
        version: 4.1.14
      tsx:
        specifier: ^4.19.1
        version: 4.20.6
      tw-animate-css:
        specifier: ^1.4.0
        version: 1.4.0
      typescript:
        specifier: 5.9.3
        version: 5.9.3
      vite:
        specifier: ^7.1.7
        version: 7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6)
      vite-plugin-manus-runtime:
        specifier: 0.0.59
        version: 0.0.59
      vitest:
        specifier: ^2.1.4
        version: 2.1.9(@types/node@24.7.0)(lightningcss@1.30.1)

packages:

  '@antfu/install-pkg@1.1.0':
    resolution: {integrity: sha512-MGQsmw10ZyI+EJo45CdSER4zEb+p31LpDAFp2Z3gkSd1yqVZGi0Ebx++YTEMonJy4oChEMLsxZ64j8FH6sSqtQ==}

  '@antfu/utils@9.3.0':
    resolution: {integrity: sha512-9hFT4RauhcUzqOE4f1+frMKLZrgNog5b06I7VmZQV1BkvwvqrbC8EBZf3L1eEL2AKb6rNKjER0sEvJiSP1FXEA==}

  '@aws-sdk/checksums@3.1000.28':
    resolution: {integrity: sha512-VCpnmyHQ1IH49ni3LXnQj7DPr7rmcJmzYeiCkYdCcfgNtkvOj38cdcL9lapBWoItZWFACJPFJlymqC7/gem3Gw==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/client-s3@3.1114.0':
    resolution: {integrity: sha512-ZeAgOtB+CXFaWXph98U7a/XrBlVx1lQ2rCJRWLxLmAaQ9k5lht6DWfwnEcVjdzduK/ySao1tCjq0fBAScGqjAg==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/core@3.977.8':
    resolution: {integrity: sha512-7+Kcrkvrk9lM/m7jRhHpT4jCdvzGHsuaSRbF8TdzzkY1mRzp/Ogwf9c7H29k4gGhey0BBWhCWr16+t0J61gwmg==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/credential-provider-env@3.972.69':
    resolution: {integrity: sha512-AreCFzcB4kH2HF9031Ot0jSJr3KXvRg6e8uDeub20JEVdZU3Bv0sTq1plc7VsT3KiqutlzH7l0j50UcCWHUioA==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/credential-provider-http@3.972.71':
    resolution: {integrity: sha512-A8ObcqVmDMnk4F9NozZ7JwmUu9Q4xyBJkmyq1C5U+wNM9ht9J7+EuuyabsLWXZnOoTqFaJuYBYTKf5CTipkEjA==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/credential-provider-ini@3.973.14':
    resolution: {integrity: sha512-7c+Wti2LsERNWMfm7ySz3/6RPopFW3Nmn7s63Xpcq6R/tRuY5hpvkHA2xVgi5ukJbvok9l0IDtVEvqTtg+X7dw==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/credential-provider-login@3.972.76':
    resolution: {integrity: sha512-LVixwOnEJfrrfKHeZjBA8pIMTZjNDq8ak8VpcoWUuCJDrSnBNU8POJksULMgvN089P0MXtQYH2Zs627/MK1K0g==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/credential-provider-node@3.972.80':
    resolution: {integrity: sha512-bE2qh8ww4iClO1jHsBXdOE8FUgzDbdxbyorNjSCoPSkQd51k3jODItuPZfuwcLHZqDXsH+bI4AMHhqtuyR7mSg==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/credential-provider-process@3.972.69':
    resolution: {integrity: sha512-9kpTNdZTrcqXTfhxM7fgl9Z68ek3Fu5oe3Yf+A/pJGibEqpgZxz2tSY7SinmyCIU2PJ+ygY4FPoBBnLpocMtrQ==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/credential-provider-sso@3.973.13':
    resolution: {integrity: sha512-Oc81qauMPzUoTnAS2YKpNwY6sY/LUyQTEeaf6yP197WMxkEBQfcKLR1MFpD7+pNTubXnfkH6gwpji+Gc7iyD2Q==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/credential-provider-web-identity@3.972.75':
    resolution: {integrity: sha512-YPN6uoGDgjjjeVFZrcOeCJqmB6zpXoeeNgIjqe+DexJaWqdjVfCCe+VAZwli9Z2h8KhFW8oxkO39emQ1tyz/Mw==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/middleware-sdk-s3@3.972.74':
    resolution: {integrity: sha512-2lzoV2z2QO5KJZYGOCnIZ1WVQgzMECvwuzr1xb034a++8QW4U4eGrmC2u4yg1xvNv4TLL/Uv5DLyuAiw0b9z7Q==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/nested-clients@3.997.43':
    resolution: {integrity: sha512-bit+VpqWNyi3wHxFoTsTliNXimCSL2r2OeDTm7ZrG+YsTZ2D7ofDJ6r/t9PVBn80i6/v0X2h9Tgw6QP2MAKfPw==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/s3-request-presigner@3.1114.0':
    resolution: {integrity: sha512-z1HQYonZxSJQj6JxWGTyNzOore/46bQ8ZFNAlZJlVs1Ot5oi4bB9AR409mJJrMH7YNjKaEP7bOx+wDoN/RheNQ==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/signature-v4-multi-region@3.996.45':
    resolution: {integrity: sha512-bBuyztukzXq6plzFGHAWiQt0QXo+HL8b8lX5cFTzkez/74PtS1c0qPFCIVuHkyoT+miH2qOjAcm1/yoro2ESPA==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/token-providers@3.1111.0':
    resolution: {integrity: sha512-JfljgoVtl+s3Qy21n9a7Z48uCQaOXcN74KJ3TEQfPoB293GrXFSt6HSQJF1sTZ8c/5QedEvd3NjJQMO4u9qa5A==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/types@3.974.4':
    resolution: {integrity: sha512-dSFDNG00MEz0/xl5gxL62giLd1iYyJsTxZ1I1DOj6lC+bbgLB4TRsYClJg3b62dhXT1uATzsTNXPnC+33EJV3A==}
    engines: {node: '>=20.0.0'}

  '@aws-sdk/xml-builder@3.972.39':
    resolution: {integrity: sha512-FTti8DS5MMWXNUWiRwXAJeYS+0GHHiMy0+7XOhcwk63ILHmfS2UFy2z/HNpZCSOJJ3P3dnWY6hfYNW3DF0nXUA==}
    engines: {node: '>=20.0.0'}

  '@aws/lambda-invoke-store@0.3.0':
    resolution: {integrity: sha512-sl4Bm6yiMNYrZKkqqDFWN0UfnWhlS8ivKxrYl+6t0gCLrqr8y3B2IqZZbFRkfaVVp7C/baApyh71P+LeE1A2sQ==}
    engines: {node: '>=18.0.0'}

  '@babel/code-frame@7.27.1':
    resolution: {integrity: sha512-cjQ7ZlQ0Mv3b47hABuTevyTuYN4i+loJKGeV9flcCgIK37cCXRh+L1bd3iBHlynerhQ7BhCkn2BPbQUL+rGqFg==}
    engines: {node: '>=6.9.0'}

  '@babel/compat-data@7.28.4':
    resolution: {integrity: sha512-YsmSKC29MJwf0gF8Rjjrg5LQCmyh+j/nD8/eP7f+BeoQTKYqs9RoWbjGOdy0+1Ekr68RJZMUOPVQaQisnIo4Rw==}
    engines: {node: '>=6.9.0'}

  '@babel/core@7.28.4':
    resolution: {integrity: sha512-2BCOP7TN8M+gVDj7/ht3hsaO/B/n5oDbiAyyvnRlNOs+u1o+JWNYTQrmpuNp1/Wq2gcFrI01JAW+paEKDMx/CA==}
    engines: {node: '>=6.9.0'}

  '@babel/generator@7.28.3':
    resolution: {integrity: sha512-3lSpxGgvnmZznmBkCRnVREPUFJv2wrv9iAoFDvADJc0ypmdOxdUtcLeBgBJ6zE0PMeTKnxeQzyk0xTBq4Ep7zw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-compilation-targets@7.27.2':
    resolution: {integrity: sha512-2+1thGUUWWjLTYTHZWK1n8Yga0ijBz1XAhUXcKy81rd5g6yh7hGqMp45v7cadSbEHc9G3OTv45SyneRN3ps4DQ==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-globals@7.28.0':
    resolution: {integrity: sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-module-imports@7.27.1':
    resolution: {integrity: sha512-0gSFWUPNXNopqtIPQvlD5WgXYI5GY2kP2cCvoT8kczjbfcfuIljTbcWrulD1CIPIX2gt1wghbDy08yE1p+/r3w==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-module-transforms@7.28.3':
    resolution: {integrity: sha512-gytXUbs8k2sXS9PnQptz5o0QnpLL51SwASIORY6XaBKF88nsOT0Zw9szLqlSGQDP/4TljBAD5y98p2U1fqkdsw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0

  '@babel/helper-plugin-utils@7.27.1':
    resolution: {integrity: sha512-1gn1Up5YXka3YYAHGKpbideQ5Yjf1tDa9qYcgysz+cNCXukyLl6DjPXhD3VRwSb8c0J9tA4b2+rHEZtc6R0tlw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-string-parser@7.27.1':
    resolution: {integrity: sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-validator-identifier@7.27.1':
    resolution: {integrity: sha512-D2hP9eA+Sqx1kBZgzxZh0y1trbuU+JoDkiEwqhQ36nodYqJwyEIhPSdMNd7lOm/4io72luTPWH20Yda0xOuUow==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-validator-option@7.27.1':
    resolution: {integrity: sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg==}
    engines: {node: '>=6.9.0'}

  '@babel/helpers@7.28.4':
    resolution: {integrity: sha512-HFN59MmQXGHVyYadKLVumYsA9dBFun/ldYxipEjzA4196jpLZd8UjEEBLkbEkvfYreDqJhZxYAWFPtrfhNpj4w==}
    engines: {node: '>=6.9.0'}

  '@babel/parser@7.28.4':
    resolution: {integrity: sha512-yZbBqeM6TkpP9du/I2pUZnJsRMGGvOuIrhjzC1AwHwW+6he4mni6Bp/m8ijn0iOuZuPI2BfkCoSRunpyjnrQKg==}
    engines: {node: '>=6.0.0'}
    hasBin: true

  '@babel/plugin-transform-react-jsx-self@7.27.1':
    resolution: {integrity: sha512-6UzkCs+ejGdZ5mFFC/OCUrv028ab2fp1znZmCZjAOBKiBK2jXD1O+BPSfX8X2qjJ75fZBMSnQn3Rq2mrBJK2mw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-react-jsx-source@7.27.1':
    resolution: {integrity: sha512-zbwoTsBruTeKB9hSq73ha66iFeJHuaFkUbwvqElnygoNbj/jHRsSeokowZFN3CZ64IvEqcmmkVe89OPXc7ldAw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/runtime@7.28.4':
    resolution: {integrity: sha512-Q/N6JNWvIvPnLDvjlE1OUBLPQHH6l3CltCEsHIujp45zQUSSh8K+gHnaEX45yAT1nyngnINhvWtzN+Nb9D8RAQ==}
    engines: {node: '>=6.9.0'}

  '@babel/template@7.27.2':
    resolution: {integrity: sha512-LPDZ85aEJyYSd18/DkjNh4/y1ntkE5KwUHWTiqgRxruuZL2F1yuHligVHLvcHY2vMHXttKFpJn6LwfI7cw7ODw==}
    engines: {node: '>=6.9.0'}

  '@babel/traverse@7.28.4':
    resolution: {integrity: sha512-YEzuboP2qvQavAcjgQNVgsvHIDv6ZpwXvcvjmyySP2DIMuByS/6ioU5G9pYrWHM6T2YDfc7xga9iNzYOs12CFQ==}
    engines: {node: '>=6.9.0'}

  '@babel/types@7.28.4':
    resolution: {integrity: sha512-bkFqkLhh3pMBUQQkpVgWDWq/lqzc2678eUyDlTBhRqhCHFguYYGM0Efga7tYk4TogG/3x0EEl66/OQ+WGbWB/Q==}
    engines: {node: '>=6.9.0'}

  '@braintree/sanitize-url@7.1.1':
    resolution: {integrity: sha512-i1L7noDNxtFyL5DmZafWy1wRVhGehQmzZaz1HiN5e7iylJMSZR7ekOV7NsIqa5qBldlLrsKv4HbgFUVlQrz8Mw==}

  '@builder.io/jsx-loc-internals@0.0.1':
    resolution: {integrity: sha512-cSADapVCi07DDhcuDmcAVItqSVmji7DNyD3xxYTHyNCwhWMNnTpZjyvDIWwYFJLleyDCJ9VUtbaXtUjjqBiRqw==}

  '@builder.io/vite-plugin-jsx-loc@0.1.1':
    resolution: {integrity: sha512-iAHFkaLBDJBC+EkGO1hF7hnIW2+oKKYVOl8NFAQH//3xeNEzvGdS9tOALRPR+JjR/M5NLyj+FG0VV7WFb1aJmw==}
    peerDependencies:
      vite: ^4.0.0 || ^5.0.0

  '@chevrotain/cst-dts-gen@11.0.3':
    resolution: {integrity: sha512-BvIKpRLeS/8UbfxXxgC33xOumsacaeCKAjAeLyOn7Pcp95HiRbrpl14S+9vaZLolnbssPIUuiUd8IvgkRyt6NQ==}

  '@chevrotain/gast@11.0.3':
    resolution: {integrity: sha512-+qNfcoNk70PyS/uxmj3li5NiECO+2YKZZQMbmjTqRI3Qchu8Hig/Q9vgkHpI3alNjr7M+a2St5pw5w5F6NL5/Q==}

  '@chevrotain/regexp-to-ast@11.0.3':
    resolution: {integrity: sha512-1fMHaBZxLFvWI067AVbGJav1eRY7N8DDvYCTwGBiE/ytKBgP8azTdgyrKyWZ9Mfh09eHWb5PgTSO8wi7U824RA==}

  '@chevrotain/types@11.0.3':
    resolution: {integrity: sha512-gsiM3G8b58kZC2HaWR50gu6Y1440cHiJ+i3JUvcp/35JchYejb2+5MVeJK0iKThYpAa/P2PYFV4hoi44HD+aHQ==}

  '@chevrotain/utils@11.0.3':
    resolution: {integrity: sha512-YslZMgtJUyuMbZ+aKvfF3x1f5liK4mWNxghFRv7jqRR9C3R3fAOGTTKvxXDa2Y1s9zSbcpuO0cAxDYsc9SrXoQ==}

  '@date-fns/tz@1.4.1':
    resolution: {integrity: sha512-P5LUNhtbj6YfI3iJjw5EL9eUAG6OitD0W3fWQcpQjDRc/QIsL0tRNuO1PcDvPccWL1fSTXXdE1ds+l95DV/OFA==}

  '@drizzle-team/brocli@0.10.2':
    resolution: {integrity: sha512-z33Il7l5dKjUgGULTqBsQBQwckHh5AbIuxhdsIxDDiZAzBOrZO6q9ogcWC65kU382AfynTfgNumVcNIjuIua6w==}

  '@emnapi/runtime@1.11.3':
    resolution: {integrity: sha512-Xz4Tpyki7XyrpbUK1jR1AhdAdaXyhhY4lZ3neLodmhpuWfy2PAQN5B46sAiU4liOXGLkHypn/qU+jvfWSCYYLA==}

  '@esbuild-kit/core-utils@3.3.2':
    resolution: {integrity: sha512-sPRAnw9CdSsRmEtnsl2WXWdyquogVpB3yZ3dgwJfe8zrOzTsV7cJvmwrKVa+0ma5BoiGJ+BoqkMvawbayKUsqQ==}
    deprecated: 'Merged into tsx: https://tsx.hirok.io'

  '@esbuild-kit/esm-loader@2.6.5':
    resolution: {integrity: sha512-FxEMIkJKnodyA1OaCUoEvbYRkoZlLZ4d/eXFu9Fh8CbBBgP5EmZxrfTRyN0qpXZ4vOvqnE5YdRdcrmUUXuU+dA==}
    deprecated: 'Merged into tsx: https://tsx.hirok.io'

  '@esbuild/aix-ppc64@0.21.5':
    resolution: {integrity: sha512-1SDgH6ZSPTlggy1yI6+Dbkiz8xzpHJEVAlF/AM1tHPLsf5STom9rwtjE4hKAF20FfXXNTFqEYXyJNWh1GiZedQ==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [aix]

  '@esbuild/aix-ppc64@0.25.10':
    resolution: {integrity: sha512-0NFWnA+7l41irNuaSVlLfgNT12caWJVLzp5eAVhZ0z1qpxbockccEt3s+149rE64VUI3Ml2zt8Nv5JVc4QXTsw==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [aix]

  '@esbuild/aix-ppc64@0.28.2':
    resolution: {integrity: sha512-XExcO+dvLKvVtNTibSTBej1NCAbaGhWn9Ww1ZPx80qsahhPFe/8jgWP0IchNe0F3HwkU7n8ejhH8bjonqht8mQ==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [aix]

  '@esbuild/android-arm64@0.18.20':
    resolution: {integrity: sha512-Nz4rJcchGDtENV0eMKUNa6L12zz2zBDXuhj/Vjh18zGqB44Bi7MBMSXjgunJgjRhCmKOjnPuZp4Mb6OKqtMHLQ==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [android]

  '@esbuild/android-arm64@0.21.5':
    resolution: {integrity: sha512-c0uX9VAUBQ7dTDCjq+wdyGLowMdtR/GoC2U5IYk/7D1H1JYC0qseD7+11iMP2mRLN9RcCMRcjC4YMclCzGwS/A==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [android]

  '@esbuild/android-arm64@0.25.10':
    resolution: {integrity: sha512-LSQa7eDahypv/VO6WKohZGPSJDq5OVOo3UoFR1E4t4Gj1W7zEQMUhI+lo81H+DtB+kP+tDgBp+M4oNCwp6kffg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [android]

  '@esbuild/android-arm64@0.28.2':
    resolution: {integrity: sha512-5YfKeeI8qWfBZIX+u2xZC3Zlb3Os/gLS2sbEKM+I4ZOcsWmHS2WLysCcQZDAFRslDUU5Oiq44gf6PYN1vGwG5A==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [android]

  '@esbuild/android-arm@0.18.20':
    resolution: {integrity: sha512-fyi7TDI/ijKKNZTUJAQqiG5T7YjJXgnzkURqmGj13C6dCqckZBLdl4h7bkhHt/t0WP+zO9/zwroDvANaOqO5Sw==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [android]

  '@esbuild/android-arm@0.21.5':
    resolution: {integrity: sha512-vCPvzSjpPHEi1siZdlvAlsPxXl7WbOVUBBAowWug4rJHb68Ox8KualB+1ocNvT5fjv6wpkX6o/iEpbDrf68zcg==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [android]

  '@esbuild/android-arm@0.25.10':
    resolution: {integrity: sha512-dQAxF1dW1C3zpeCDc5KqIYuZ1tgAdRXNoZP7vkBIRtKZPYe2xVr/d3SkirklCHudW1B45tGiUlz2pUWDfbDD4w==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [android]

  '@esbuild/android-arm@0.28.2':
    resolution: {integrity: sha512-kXXoiPVVGQcnIYGOeaovwOURpniDBpSq4A03qkQ+BMQqtGG6HYap3xne9C1O1yo4TR3qxlCX5IqqmX6fFo2Lqg==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [android]

  '@esbuild/android-x64@0.18.20':
    resolution: {integrity: sha512-8GDdlePJA8D6zlZYJV/jnrRAi6rOiNaCC/JclcXpB+KIuvfBN4owLtgzY2bsxnx666XjJx2kDPUmnTtR8qKQUg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [android]

  '@esbuild/android-x64@0.21.5':
    resolution: {integrity: sha512-D7aPRUUNHRBwHxzxRvp856rjUHRFW1SdQATKXH2hqA0kAZb1hKmi02OpYRacl0TxIGz/ZmXWlbZgjwWYaCakTA==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [android]

  '@esbuild/android-x64@0.25.10':
    resolution: {integrity: sha512-MiC9CWdPrfhibcXwr39p9ha1x0lZJ9KaVfvzA0Wxwz9ETX4v5CHfF09bx935nHlhi+MxhA63dKRRQLiVgSUtEg==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [android]

  '@esbuild/android-x64@0.28.2':
    resolution: {integrity: sha512-O387ite7SzUyCcy3JQX4P4bLtEA7bLLkx+esve5JHnyYfNTxcVpXZo9jhdB0lTKN44gztELTdU7nS8Nr16Fs1Q==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [android]

  '@esbuild/darwin-arm64@0.18.20':
    resolution: {integrity: sha512-bxRHW5kHU38zS2lPTPOyuyTm+S+eobPUnTNkdJEfAddYgEcll4xkT8DB9d2008DtTbl7uJag2HuE5NZAZgnNEA==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [darwin]

  '@esbuild/darwin-arm64@0.21.5':
    resolution: {integrity: sha512-DwqXqZyuk5AiWWf3UfLiRDJ5EDd49zg6O9wclZ7kUMv2WRFr4HKjXp/5t8JZ11QbQfUS6/cRCKGwYhtNAY88kQ==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [darwin]

  '@esbuild/darwin-arm64@0.25.10':
    resolution: {integrity: sha512-JC74bdXcQEpW9KkV326WpZZjLguSZ3DfS8wrrvPMHgQOIEIG/sPXEN/V8IssoJhbefLRcRqw6RQH2NnpdprtMA==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [darwin]

  '@esbuild/darwin-arm64@0.28.2':
    resolution: {integrity: sha512-n4KqkOQrraxHJcgjM1RvwbigfQKIKJVpM7xp+KsxiyUSrRdIXnt73VhrPAx0fV44hgfmIVKjxMN9J1t5jySVkw==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [darwin]

  '@esbuild/darwin-x64@0.18.20':
    resolution: {integrity: sha512-pc5gxlMDxzm513qPGbCbDukOdsGtKhfxD1zJKXjCCcU7ju50O7MeAZ8c4krSJcOIJGFR+qx21yMMVYwiQvyTyQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [darwin]

  '@esbuild/darwin-x64@0.21.5':
    resolution: {integrity: sha512-se/JjF8NlmKVG4kNIuyWMV/22ZaerB+qaSi5MdrXtd6R08kvs2qCN4C09miupktDitvh8jRFflwGFBQcxZRjbw==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [darwin]

  '@esbuild/darwin-x64@0.25.10':
    resolution: {integrity: sha512-tguWg1olF6DGqzws97pKZ8G2L7Ig1vjDmGTwcTuYHbuU6TTjJe5FXbgs5C1BBzHbJ2bo1m3WkQDbWO2PvamRcg==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [darwin]

  '@esbuild/darwin-x64@0.28.2':
    resolution: {integrity: sha512-uq6suIWYP37qzGddBKPw5QEQPi6HiLGsO7UmkpfyaYNQ3D+rN6w6WfwH+nuqcGXWvawGwxOEroO4YGnFh95azw==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [darwin]

  '@esbuild/freebsd-arm64@0.18.20':
    resolution: {integrity: sha512-yqDQHy4QHevpMAaxhhIwYPMv1NECwOvIpGCZkECn8w2WFHXjEwrBn3CeNIYsibZ/iZEUemj++M26W3cNR5h+Tw==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [freebsd]

  '@esbuild/freebsd-arm64@0.21.5':
    resolution: {integrity: sha512-5JcRxxRDUJLX8JXp/wcBCy3pENnCgBR9bN6JsY4OmhfUtIHe3ZW0mawA7+RDAcMLrMIZaf03NlQiX9DGyB8h4g==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [freebsd]

  '@esbuild/freebsd-arm64@0.25.10':
    resolution: {integrity: sha512-3ZioSQSg1HT2N05YxeJWYR+Libe3bREVSdWhEEgExWaDtyFbbXWb49QgPvFH8u03vUPX10JhJPcz7s9t9+boWg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [freebsd]

  '@esbuild/freebsd-arm64@0.28.2':
    resolution: {integrity: sha512-n+I0BTSRIoy+d6RPKnEVwql5UwBJolytvY4mAOIEJorKlqgPII8ix6slVVrfZ5Tnj7glIZvloylbB/EJPMWEXw==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [freebsd]

  '@esbuild/freebsd-x64@0.18.20':
    resolution: {integrity: sha512-tgWRPPuQsd3RmBZwarGVHZQvtzfEBOreNuxEMKFcd5DaDn2PbBxfwLcj4+aenoh7ctXcbXmOQIn8HI6mCSw5MQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [freebsd]

  '@esbuild/freebsd-x64@0.21.5':
    resolution: {integrity: sha512-J95kNBj1zkbMXtHVH29bBriQygMXqoVQOQYA+ISs0/2l3T9/kj42ow2mpqerRBxDJnmkUDCaQT/dfNXWX/ZZCQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [freebsd]

  '@esbuild/freebsd-x64@0.25.10':
    resolution: {integrity: sha512-LLgJfHJk014Aa4anGDbh8bmI5Lk+QidDmGzuC2D+vP7mv/GeSN+H39zOf7pN5N8p059FcOfs2bVlrRr4SK9WxA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [freebsd]

  '@esbuild/freebsd-x64@0.28.2':
    resolution: {integrity: sha512-78XJTJkvPs0kz2w61301PJjXl4g7q3JqiYMZ/M/yVI73EHBrCRTgkhu9oqG7vPqq+a/yadEW8aD+agKlk5xrmg==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [freebsd]

  '@esbuild/linux-arm64@0.18.20':
    resolution: {integrity: sha512-2YbscF+UL7SQAVIpnWvYwM+3LskyDmPhe31pE7/aoTMFKKzIc9lLbyGUpmmb8a8AixOL61sQ/mFh3jEjHYFvdA==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [linux]

  '@esbuild/linux-arm64@0.21.5':
    resolution: {integrity: sha512-ibKvmyYzKsBeX8d8I7MH/TMfWDXBF3db4qM6sy+7re0YXya+K1cem3on9XgdT2EQGMu4hQyZhan7TeQ8XkGp4Q==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [linux]

  '@esbuild/linux-arm64@0.25.10':
    resolution: {integrity: sha512-5luJWN6YKBsawd5f9i4+c+geYiVEw20FVW5x0v1kEMWNq8UctFjDiMATBxLvmmHA4bf7F6hTRaJgtghFr9iziQ==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [linux]

  '@esbuild/linux-arm64@0.28.2':
    resolution: {integrity: sha512-pW4AC0P3it8c7do9MVM4p51FzHzdM/TZrerurgRcHJ2WTa1VQ1CIq18xncfpBJw4ojkiZZrKW2yIBWBP92j6Ug==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [linux]

  '@esbuild/linux-arm@0.18.20':
    resolution: {integrity: sha512-/5bHkMWnq1EgKr1V+Ybz3s1hWXok7mDFUMQ4cG10AfW3wL02PSZi5kFpYKrptDsgb2WAJIvRcDm+qIvXf/apvg==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [linux]

  '@esbuild/linux-arm@0.21.5':
    resolution: {integrity: sha512-bPb5AHZtbeNGjCKVZ9UGqGwo8EUu4cLq68E95A53KlxAPRmUyYv2D6F0uUI65XisGOL1hBP5mTronbgo+0bFcA==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [linux]

  '@esbuild/linux-arm@0.25.10':
    resolution: {integrity: sha512-oR31GtBTFYCqEBALI9r6WxoU/ZofZl962pouZRTEYECvNF/dtXKku8YXcJkhgK/beU+zedXfIzHijSRapJY3vg==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [linux]

  '@esbuild/linux-arm@0.28.2':
    resolution: {integrity: sha512-XlDnu2q5yoqems+xay6wSAcg9DDD7K9RLKZEBOMZm3ckNpJBvOX20tSfby8KfrrhINDyv9V2YVZKY/SpoGJI8w==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [linux]

  '@esbuild/linux-ia32@0.18.20':
    resolution: {integrity: sha512-P4etWwq6IsReT0E1KHU40bOnzMHoH73aXp96Fs8TIT6z9Hu8G6+0SHSw9i2isWrD2nbx2qo5yUqACgdfVGx7TA==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [linux]

  '@esbuild/linux-ia32@0.21.5':
    resolution: {integrity: sha512-YvjXDqLRqPDl2dvRODYmmhz4rPeVKYvppfGYKSNGdyZkA01046pLWyRKKI3ax8fbJoK5QbxblURkwK/MWY18Tg==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [linux]

  '@esbuild/linux-ia32@0.25.10':
    resolution: {integrity: sha512-NrSCx2Kim3EnnWgS4Txn0QGt0Xipoumb6z6sUtl5bOEZIVKhzfyp/Lyw4C1DIYvzeW/5mWYPBFJU3a/8Yr75DQ==}
    engines: {node: '>=18'}
    cpu: [ia32]
    os: [linux]

  '@esbuild/linux-ia32@0.28.2':
    resolution: {integrity: sha512-CYbnj78HsIeA+DhgUKgFCfvNsTHFhMMrinUrMZpDXJXKN8T3XViTZ/+wtHeVxEWY8ewSzTFN+nRmSwO2tZaLUQ==}
    engines: {node: '>=18'}
    cpu: [ia32]
    os: [linux]

  '@esbuild/linux-loong64@0.18.20':
    resolution: {integrity: sha512-nXW8nqBTrOpDLPgPY9uV+/1DjxoQ7DoB2N8eocyq8I9XuqJ7BiAMDMf9n1xZM9TgW0J8zrquIb/A7s3BJv7rjg==}
    engines: {node: '>=12'}
    cpu: [loong64]
    os: [linux]

  '@esbuild/linux-loong64@0.21.5':
    resolution: {integrity: sha512-uHf1BmMG8qEvzdrzAqg2SIG/02+4/DHB6a9Kbya0XDvwDEKCoC8ZRWI5JJvNdUjtciBGFQ5PuBlpEOXQj+JQSg==}
    engines: {node: '>=12'}
    cpu: [loong64]
    os: [linux]

  '@esbuild/linux-loong64@0.25.10':
    resolution: {integrity: sha512-xoSphrd4AZda8+rUDDfD9J6FUMjrkTz8itpTITM4/xgerAZZcFW7Dv+sun7333IfKxGG8gAq+3NbfEMJfiY+Eg==}
    engines: {node: '>=18'}
    cpu: [loong64]
    os: [linux]

  '@esbuild/linux-loong64@0.28.2':
    resolution: {integrity: sha512-buwkd8nsph4R+ajRvw0qM5Hja/TXQow3ptzWO2EbG/cqcIkHloRrdlBtQlshyYGTNFvfkfJ5tpPLVkY4DtsPfQ==}
    engines: {node: '>=18'}
    cpu: [loong64]
    os: [linux]

  '@esbuild/linux-mips64el@0.18.20':
    resolution: {integrity: sha512-d5NeaXZcHp8PzYy5VnXV3VSd2D328Zb+9dEq5HE6bw6+N86JVPExrA6O68OPwobntbNJ0pzCpUFZTo3w0GyetQ==}
    engines: {node: '>=12'}
    cpu: [mips64el]
    os: [linux]

  '@esbuild/linux-mips64el@0.21.5':
    resolution: {integrity: sha512-IajOmO+KJK23bj52dFSNCMsz1QP1DqM6cwLUv3W1QwyxkyIWecfafnI555fvSGqEKwjMXVLokcV5ygHW5b3Jbg==}
    engines: {node: '>=12'}
    cpu: [mips64el]
    os: [linux]

  '@esbuild/linux-mips64el@0.25.10':
    resolution: {integrity: sha512-ab6eiuCwoMmYDyTnyptoKkVS3k8fy/1Uvq7Dj5czXI6DF2GqD2ToInBI0SHOp5/X1BdZ26RKc5+qjQNGRBelRA==}
    engines: {node: '>=18'}
    cpu: [mips64el]
    os: [linux]

  '@esbuild/linux-mips64el@0.28.2':
    resolution: {integrity: sha512-ZVykbDyk7519VwiNb9Lcj9m8XM6v5V9uKPvrEMkkEedVewf+0itkhahp4HDpgERXhwLRpWFypsGbG/J8s0QjJA==}
    engines: {node: '>=18'}
    cpu: [mips64el]
    os: [linux]

  '@esbuild/linux-ppc64@0.18.20':
    resolution: {integrity: sha512-WHPyeScRNcmANnLQkq6AfyXRFr5D6N2sKgkFo2FqguP44Nw2eyDlbTdZwd9GYk98DZG9QItIiTlFLHJHjxP3FA==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [linux]

  '@esbuild/linux-ppc64@0.21.5':
    resolution: {integrity: sha512-1hHV/Z4OEfMwpLO8rp7CvlhBDnjsC3CttJXIhBi+5Aj5r+MBvy4egg7wCbe//hSsT+RvDAG7s81tAvpL2XAE4w==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [linux]

  '@esbuild/linux-ppc64@0.25.10':
    resolution: {integrity: sha512-NLinzzOgZQsGpsTkEbdJTCanwA5/wozN9dSgEl12haXJBzMTpssebuXR42bthOF3z7zXFWH1AmvWunUCkBE4EA==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [linux]

  '@esbuild/linux-ppc64@0.28.2':
    resolution: {integrity: sha512-CAXl+Dtd9UUuJd8pKKdwh6MLm3MUMiqMPmhZ3tTSXPqfyQ3vDl6R5hZdZ/kYojK4ofXtdfSv1tFq8XzWx3heNQ==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [linux]

  '@esbuild/linux-riscv64@0.18.20':
    resolution: {integrity: sha512-WSxo6h5ecI5XH34KC7w5veNnKkju3zBRLEQNY7mv5mtBmrP/MjNBCAlsM2u5hDBlS3NGcTQpoBvRzqBcRtpq1A==}
    engines: {node: '>=12'}
    cpu: [riscv64]
    os: [linux]

  '@esbuild/linux-riscv64@0.21.5':
    resolution: {integrity: sha512-2HdXDMd9GMgTGrPWnJzP2ALSokE/0O5HhTUvWIbD3YdjME8JwvSCnNGBnTThKGEB91OZhzrJ4qIIxk/SBmyDDA==}
    engines: {node: '>=12'}
    cpu: [riscv64]
    os: [linux]

  '@esbuild/linux-riscv64@0.25.10':
    resolution: {integrity: sha512-FE557XdZDrtX8NMIeA8LBJX3dC2M8VGXwfrQWU7LB5SLOajfJIxmSdyL/gU1m64Zs9CBKvm4UAuBp5aJ8OgnrA==}
    engines: {node: '>=18'}
    cpu: [riscv64]
    os: [linux]

  '@esbuild/linux-riscv64@0.28.2':
    resolution: {integrity: sha512-GeXCej4IQtU1B+QlDV8W/RRvbzI3O/Stss+/bCXv4lZls5WGRtu2a+3JkA3i4qIUlMXpcHebWpF8AkJhATowuA==}
    engines: {node: '>=18'}
    cpu: [riscv64]
    os: [linux]

  '@esbuild/linux-s390x@0.18.20':
    resolution: {integrity: sha512-+8231GMs3mAEth6Ja1iK0a1sQ3ohfcpzpRLH8uuc5/KVDFneH6jtAJLFGafpzpMRO6DzJ6AvXKze9LfFMrIHVQ==}
    engines: {node: '>=12'}
    cpu: [s390x]
    os: [linux]

  '@esbuild/linux-s390x@0.21.5':
    resolution: {integrity: sha512-zus5sxzqBJD3eXxwvjN1yQkRepANgxE9lgOW2qLnmr8ikMTphkjgXu1HR01K4FJg8h1kEEDAqDcZQtbrRnB41A==}
    engines: {node: '>=12'}
    cpu: [s390x]
    os: [linux]

  '@esbuild/linux-s390x@0.25.10':
    resolution: {integrity: sha512-3BBSbgzuB9ajLoVZk0mGu+EHlBwkusRmeNYdqmznmMc9zGASFjSsxgkNsqmXugpPk00gJ0JNKh/97nxmjctdew==}
    engines: {node: '>=18'}
    cpu: [s390x]
    os: [linux]

  '@esbuild/linux-s390x@0.28.2':
    resolution: {integrity: sha512-3H1weTYZPxt/WOhByszQZybS9w5lKzUn1FDMsgEChbHWQwHYQQRfBxgCcZvPhjHfKyJjIievvMmEUawJrdY9Dg==}
    engines: {node: '>=18'}
    cpu: [s390x]
    os: [linux]

  '@esbuild/linux-x64@0.18.20':
    resolution: {integrity: sha512-UYqiqemphJcNsFEskc73jQ7B9jgwjWrSayxawS6UVFZGWrAAtkzjxSqnoclCXxWtfwLdzU+vTpcNYhpn43uP1w==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [linux]

  '@esbuild/linux-x64@0.21.5':
    resolution: {integrity: sha512-1rYdTpyv03iycF1+BhzrzQJCdOuAOtaqHTWJZCWvijKD2N5Xu0TtVC8/+1faWqcP9iBCWOmjmhoH94dH82BxPQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [linux]

  '@esbuild/linux-x64@0.25.10':
    resolution: {integrity: sha512-QSX81KhFoZGwenVyPoberggdW1nrQZSvfVDAIUXr3WqLRZGZqWk/P4T8p2SP+de2Sr5HPcvjhcJzEiulKgnxtA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [linux]

  '@esbuild/linux-x64@0.28.2':
    resolution: {integrity: sha512-4xTZr1FUmSoQW4XIWmit3tzQrUTZM+N3P0XV8xROKYF50XfI7xeO90+1bZvNwxIufQ9hDQVRJH5YhgPVF8A/HQ==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [linux]

  '@esbuild/netbsd-arm64@0.25.10':
    resolution: {integrity: sha512-AKQM3gfYfSW8XRk8DdMCzaLUFB15dTrZfnX8WXQoOUpUBQ+NaAFCP1kPS/ykbbGYz7rxn0WS48/81l9hFl3u4A==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [netbsd]

  '@esbuild/netbsd-arm64@0.28.2':
    resolution: {integrity: sha512-sSATRjPeDBg3pdgHoQfoYBob11Kk1FGa9lui5RIHZCoCkJa9QKlvl3/vKz2usCmYYjs7ymJR/2Nnsqe+Hjt5nw==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [netbsd]

  '@esbuild/netbsd-x64@0.18.20':
    resolution: {integrity: sha512-iO1c++VP6xUBUmltHZoMtCUdPlnPGdBom6IrO4gyKPFFVBKioIImVooR5I83nTew5UOYrk3gIJhbZh8X44y06A==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [netbsd]

  '@esbuild/netbsd-x64@0.21.5':
    resolution: {integrity: sha512-Woi2MXzXjMULccIwMnLciyZH4nCIMpWQAs049KEeMvOcNADVxo0UBIQPfSmxB3CWKedngg7sWZdLvLczpe0tLg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [netbsd]

  '@esbuild/netbsd-x64@0.25.10':
    resolution: {integrity: sha512-7RTytDPGU6fek/hWuN9qQpeGPBZFfB4zZgcz2VK2Z5VpdUxEI8JKYsg3JfO0n/Z1E/6l05n0unDCNc4HnhQGig==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [netbsd]

  '@esbuild/netbsd-x64@0.28.2':
    resolution: {integrity: sha512-lqnzCV+mM0gIADaKihiCg6ifgfU2L3h5E33rNQBN1Y4MaVGnzryzmvvf7UHxprpQdE8hpqLolJ9Rl+SkIRDpyw==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [netbsd]

  '@esbuild/openbsd-arm64@0.25.10':
    resolution: {integrity: sha512-5Se0VM9Wtq797YFn+dLimf2Zx6McttsH2olUBsDml+lm0GOCRVebRWUvDtkY4BWYv/3NgzS8b/UM3jQNh5hYyw==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [openbsd]

  '@esbuild/openbsd-arm64@0.28.2':
    resolution: {integrity: sha512-AL2qJILH7lNjrDmCQDvdxMfAUIv8KMNZOvrwAQ8i8//ntL9FflhOyMJ8OZSMBb8/AWXe3/5v5S20y3zCoZWKoQ==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [openbsd]

  '@esbuild/openbsd-x64@0.18.20':
    resolution: {integrity: sha512-e5e4YSsuQfX4cxcygw/UCPIEP6wbIL+se3sxPdCiMbFLBWu0eiZOJ7WoD+ptCLrmjZBK1Wk7I6D/I3NglUGOxg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [openbsd]

  '@esbuild/openbsd-x64@0.21.5':
    resolution: {integrity: sha512-HLNNw99xsvx12lFBUwoT8EVCsSvRNDVxNpjZ7bPn947b8gJPzeHWyNVhFsaerc0n3TsbOINvRP2byTZ5LKezow==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [openbsd]

  '@esbuild/openbsd-x64@0.25.10':
    resolution: {integrity: sha512-XkA4frq1TLj4bEMB+2HnI0+4RnjbuGZfet2gs/LNs5Hc7D89ZQBHQ0gL2ND6Lzu1+QVkjp3x1gIcPKzRNP8bXw==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [openbsd]

  '@esbuild/openbsd-x64@0.28.2':
    resolution: {integrity: sha512-QtiuPytchRyC4rwUKhexJdQKvDuZ6hWloi3igqPQNUJCS1/v9EiO3UTOXR6A3FoMo4fnAKbWJdqaIwhOzh8qEw==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [openbsd]

  '@esbuild/openharmony-arm64@0.25.10':
    resolution: {integrity: sha512-AVTSBhTX8Y/Fz6OmIVBip9tJzZEUcY8WLh7I59+upa5/GPhh2/aM6bvOMQySspnCCHvFi79kMtdJS1w0DXAeag==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [openharmony]

  '@esbuild/openharmony-arm64@0.28.2':
    resolution: {integrity: sha512-WkhYDmpTjLvGlScA1rwjRUmhl4k8oXR3cIbtqWmELgU/dFeHHlEllxDvdWcNJV9rbzCexB5vz8gtNewWLgCT7Q==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [openharmony]

  '@esbuild/sunos-x64@0.18.20':
    resolution: {integrity: sha512-kDbFRFp0YpTQVVrqUd5FTYmWo45zGaXe0X8E1G/LKFC0v8x0vWrhOWSLITcCn63lmZIxfOMXtCfti/RxN/0wnQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [sunos]

  '@esbuild/sunos-x64@0.21.5':
    resolution: {integrity: sha512-6+gjmFpfy0BHU5Tpptkuh8+uw3mnrvgs+dSPQXQOv3ekbordwnzTVEb4qnIvQcYXq6gzkyTnoZ9dZG+D4garKg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [sunos]

  '@esbuild/sunos-x64@0.25.10':
    resolution: {integrity: sha512-fswk3XT0Uf2pGJmOpDB7yknqhVkJQkAQOcW/ccVOtfx05LkbWOaRAtn5SaqXypeKQra1QaEa841PgrSL9ubSPQ==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [sunos]

  '@esbuild/sunos-x64@0.28.2':
    resolution: {integrity: sha512-GPMSkTOtMnv2U2F8gxe4Io6qmVs+YKyp832Etqqxr0hFngmXQ3rzwytelm3GIn7T4VviRUlf3sOgBOiTdvaf7g==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [sunos]

  '@esbuild/win32-arm64@0.18.20':
    resolution: {integrity: sha512-ddYFR6ItYgoaq4v4JmQQaAI5s7npztfV4Ag6NrhiaW0RrnOXqBkgwZLofVTlq1daVTQNhtI5oieTvkRPfZrePg==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [win32]

  '@esbuild/win32-arm64@0.21.5':
    resolution: {integrity: sha512-Z0gOTd75VvXqyq7nsl93zwahcTROgqvuAcYDUr+vOv8uHhNSKROyU961kgtCD1e95IqPKSQKH7tBTslnS3tA8A==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [win32]

  '@esbuild/win32-arm64@0.25.10':
    resolution: {integrity: sha512-ah+9b59KDTSfpaCg6VdJoOQvKjI33nTaQr4UluQwW7aEwZQsbMCfTmfEO4VyewOxx4RaDT/xCy9ra2GPWmO7Kw==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [win32]

  '@esbuild/win32-arm64@0.28.2':
    resolution: {integrity: sha512-PIhhEkE9uPBleRBrQEJpUn7MBnibZzbGzYWPmY3x+YoVg/95zbjB4CxPPOQ8l5tYYM4mMaCthF8/1DIfBQQyWQ==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [win32]

  '@esbuild/win32-ia32@0.18.20':
    resolution: {integrity: sha512-Wv7QBi3ID/rROT08SABTS7eV4hX26sVduqDOTe1MvGMjNd3EjOz4b7zeexIR62GTIEKrfJXKL9LFxTYgkyeu7g==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [win32]

  '@esbuild/win32-ia32@0.21.5':
    resolution: {integrity: sha512-SWXFF1CL2RVNMaVs+BBClwtfZSvDgtL//G/smwAc5oVK/UPu2Gu9tIaRgFmYFFKrmg3SyAjSrElf0TiJ1v8fYA==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [win32]

  '@esbuild/win32-ia32@0.25.10':
    resolution: {integrity: sha512-QHPDbKkrGO8/cz9LKVnJU22HOi4pxZnZhhA2HYHez5Pz4JeffhDjf85E57Oyco163GnzNCVkZK0b/n4Y0UHcSw==}
    engines: {node: '>=18'}
    cpu: [ia32]
    os: [win32]

  '@esbuild/win32-ia32@0.28.2':
    resolution: {integrity: sha512-YmJbfTlvU7Sdn9BB+4PRES4oB6pxgS37MAONj+hBr/cpXS1aBPKXxNnDbu+QCWPj0o9dgyxeq79g6c5P8KeuYA==}
    engines: {node: '>=18'}
    cpu: [ia32]
    os: [win32]

  '@esbuild/win32-x64@0.18.20':
    resolution: {integrity: sha512-kTdfRcSiDfQca/y9QIkng02avJ+NCaQvrMejlsB3RRv5sE9rRoeBPISaZpKxHELzRxZyLvNts1P27W3wV+8geQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [win32]

  '@esbuild/win32-x64@0.21.5':
    resolution: {integrity: sha512-tQd/1efJuzPC6rCFwEvLtci/xNFcTZknmXs98FYDfGE4wP9ClFV98nyKrzJKVPMhdDnjzLhdUyMX4PsQAPjwIw==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [win32]

  '@esbuild/win32-x64@0.25.10':
    resolution: {integrity: sha512-9KpxSVFCu0iK1owoez6aC/s/EdUQLDN3adTxGCqxMVhrPDj6bt5dbrHDXUuq+Bs2vATFBBrQS5vdQ/Ed2P+nbw==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [win32]

  '@esbuild/win32-x64@0.28.2':
    resolution: {integrity: sha512-5ebpxr3nWMzrL/rnUI755Jkuee0bHL/Gq0WTF9lvcpv73wAp5eu8MfBUgWK9bhWvZjj7yX8etf/8tI8Ney695g==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [win32]

  '@floating-ui/core@1.7.3':
    resolution: {integrity: sha512-sGnvb5dmrJaKEZ+LDIpguvdX3bDlEllmv4/ClQ9awcmCZrlx5jQyyMWFM5kBI+EyNOCDDiKk8il0zeuX3Zlg/w==}

  '@floating-ui/dom@1.7.4':
    resolution: {integrity: sha512-OOchDgh4F2CchOX94cRVqhvy7b3AFb+/rQXyswmzmGakRfkMgoWVjfnLWkRirfLEfuD4ysVW16eXzwt3jHIzKA==}

  '@floating-ui/react-dom@2.1.6':
    resolution: {integrity: sha512-4JX6rEatQEvlmgU80wZyq9RT96HZJa88q8hp0pBd+LrczeDI4o6uA2M+uvxngVHo4Ihr8uibXxH6+70zhAFrVw==}
    peerDependencies:
      react: '>=16.8.0'
      react-dom: '>=16.8.0'

  '@floating-ui/utils@0.2.10':
    resolution: {integrity: sha512-aGTxbpbg8/b5JfU1HXSrbH3wXZuLPJcNEcZQFMxLs3oSzgtVu6nFPkbbGGUvBcUjKV2YyB9Wxxabo+HEH9tcRQ==}

  '@hookform/resolvers@5.2.2':
    resolution: {integrity: sha512-A/IxlMLShx3KjV/HeTcTfaMxdwy690+L/ZADoeaTltLx+CVuzkeVIPuybK3jrRfw7YZnmdKsVVHAlEPIAEUNlA==}
    peerDependencies:
      react-hook-form: ^7.55.0

  '@iconify/types@2.0.0':
    resolution: {integrity: sha512-+wluvCrRhXrhyOmRDJ3q8mux9JkKy5SJ/v8ol2tu4FVjyYvtEzkc/3pK15ET6RKg4b4w4BmTk1+gsCUhf21Ykg==}

  '@iconify/utils@3.0.2':
    resolution: {integrity: sha512-EfJS0rLfVuRuJRn4psJHtK2A9TqVnkxPpHY6lYHiB9+8eSuudsxbwMiavocG45ujOo6FJ+CIRlRnlOGinzkaGQ==}

  '@img/colour@1.1.0':
    resolution: {integrity: sha512-Td76q7j57o/tLVdgS746cYARfSyxk8iEfRxewL9h4OMzYhbW4TAcppl0mT4eyqXddh6L/jwoM75mo7ixa/pCeQ==}
    engines: {node: '>=18'}

  '@img/sharp-darwin-arm64@0.35.3':
    resolution: {integrity: sha512-RMnFX7YQsMoh7lWfcM4NEHHymBX/rLuKNPVM84XE9ONPcaSCDgE7CHIHpSgPcO2xcRthgBy1HfNO319mwhIAkg==}
    engines: {node: '>=20.9.0'}
    cpu: [arm64]
    os: [darwin]

  '@img/sharp-darwin-x64@0.35.3':
    resolution: {integrity: sha512-Xo+5uFBtLN0BKqieTxiFzFPQAUlBbbH5iBKyRX/z1JrbnYsHTfKJnUfL8+p2TPXr1pXqao4eeL4Rl144uDpK9w==}
    engines: {node: '>=20.9.0'}
    cpu: [x64]
    os: [darwin]

  '@img/sharp-freebsd-wasm32@0.35.3':
    resolution: {integrity: sha512-lUxcqWIj2wMQ9BrwNjngcr1gWUr5xgaGThBRqPPalIC2n67Cqj1uPh8NnA/ZhAg8hUbKl+kVHKwgUIwe6ZYPrg==}
    engines: {node: '>=20.9.0'}
    os: [freebsd]

  '@img/sharp-libvips-darwin-arm64@1.3.2':
    resolution: {integrity: sha512-9J6ypZFpQBj4YnePGoq/S38w6nz+vqg5WZLrLGY4YuSemdMq47GMLBPO42MzwdGwpg/agZ7xzZcFHa48xlywfg==}
    cpu: [arm64]
    os: [darwin]

  '@img/sharp-libvips-darwin-x64@1.3.2':
    resolution: {integrity: sha512-m2pW1n6cns9VaubNwsZ+c3CRYjxNQWgJ5gPlnL1nbBcpkBvFm6SCFN5o0psFHI8w9n11NKhFkeEDns98tiqbEw==}
    cpu: [x64]
    os: [darwin]

  '@img/sharp-libvips-linux-arm64@1.3.2':
    resolution: {integrity: sha512-dqVSFynCox4C/J8kT16V7SIFAns0IjgLwkvYT7p8LQVmJ5OS5b6tI9IGflxTeuBS//zXeFIUbwt5dwxyZ17cnA==}
    cpu: [arm64]
    os: [linux]

  '@img/sharp-libvips-linux-arm@1.3.2':
    resolution: {integrity: sha512-1eMLzy92I4J6rmi4mAT8yC3HxOtniyGELlzGbNMLLeqe052ahFQ0h6LFq+lh5DsDIdYViIDst08abvSbcEdLXQ==}
    cpu: [arm]
    os: [linux]

  '@img/sharp-libvips-linux-ppc64@1.3.2':
    resolution: {integrity: sha512-3z0NHDxD6n5I9gc05U1eW1AyRm+Gznzq3naMrthPNqE6oYykcogW0l/jfpJdjYnuNl8R7yI9pNbE1XiUeyq0Aw==}
    cpu: [ppc64]
    os: [linux]

  '@img/sharp-libvips-linux-riscv64@1.3.2':
    resolution: {integrity: sha512-bsb4rI+NldGOsXuej2r8OdSS8+zXDVaCWxyWrcv6kneTOlgAHtZABRzBBCwdsPiD90J4myNJuHpg6kA20ImW/w==}
    cpu: [riscv64]
    os: [linux]

  '@img/sharp-libvips-linux-s390x@1.3.2':
    resolution: {integrity: sha512-/ABshyj8gCpyIrNXnHn4LorDJ0HHm1VhXPBlxZ8zAtfVPAaSafXPGn+sUSIRiwaSBy0mmFjSjiXI5mkcwdChKQ==}
    cpu: [s390x]
    os: [linux]

  '@img/sharp-libvips-linux-x64@1.3.2':
    resolution: {integrity: sha512-ITPEtgffGJ0S6G9dRyw/366tJQqFRcHWPHhC+Stpg3Z8AEMrDrTr2lhdz4f/Y/HMbRh//7Z5mBzEpVdi62Oc3w==}
    cpu: [x64]
    os: [linux]

  '@img/sharp-libvips-linuxmusl-arm64@1.3.2':
    resolution: {integrity: sha512-zE9EdiUzUmg5mDT5a1rk5fYJ6GWPloTwWBYDS14naqHsL+EaMpDj1AWnpLgh3u0YCORv2Tt50wrcrpYqkP97Kw==}
    cpu: [arm64]
    os: [linux]

  '@img/sharp-libvips-linuxmusl-x64@1.3.2':
    resolution: {integrity: sha512-m0lrLiUt+lBYnCFr8qV/65yMR4E/c7/wf78I5eKTdkEakFAlZ9QlzEM3QIhhAwVeUhLAHLcCq7a7Vszq/oFNZQ==}
    cpu: [x64]
    os: [linux]

  '@img/sharp-linux-arm64@0.35.3':
    resolution: {integrity: sha512-QgKDspHPnrU+GQ55XPhGwyhC8acLVOOSyAvo1oVfFmrIXLkDNmGWzAfDZ4xK8oSA1qBQrALcHX0G5UZni/SuFQ==}
    engines: {node: '>=20.9.0'}
    cpu: [arm64]
    os: [linux]

  '@img/sharp-linux-arm@0.35.3':
    resolution: {integrity: sha512-affVWCTLooy8TSxbDx2qkzuDeaWLNVBA+P//FNBirHsXpP2fuBhk5AuboYUnrDnzoXes8GFjpTx0SBFOCRg+FA==}
    engines: {node: '>=20.9.0'}
    cpu: [arm]
    os: [linux]

  '@img/sharp-linux-ppc64@0.35.3':
    resolution: {integrity: sha512-sMd8rDxmpLOwv/7N44klFjOD5DUO7FLdjiXDI0hoxYaf7Ar262dQIEkosE98bps+5HPLtp/EvNqeqQtOycP/IA==}
    engines: {node: '>=20.9.0'}
    cpu: [ppc64]
    os: [linux]

  '@img/sharp-linux-riscv64@0.35.3':
    resolution: {integrity: sha512-0Eob78yjlYPfL5vMNWAW55l3R9Y6BQS/gOfe0ZcP9mEz9ohhKSt4im1hayiknXgf8AWrFqMvJcKIdmLmEe7yeQ==}
    engines: {node: '>=20.9.0'}
    cpu: [riscv64]
    os: [linux]

  '@img/sharp-linux-s390x@0.35.3':
    resolution: {integrity: sha512-KgAxQ0DxpNOq1rG2t5cgTgShJFGSuU7XO45cqC+1NVOuZnP6tlgZRuSYOfNupGkHID0o3cJOsw4DVeJpMovcGw==}
    engines: {node: '>=20.9.0'}
    cpu: [s390x]
    os: [linux]

  '@img/sharp-linux-x64@0.35.3':
    resolution: {integrity: sha512-8pqvxubL2PGdhlPy6GLqzDYMUjyRmKAwKHYKixpdJYBUK7PJ0C029XdsnpFIdgRZG68fZiGdHVWcKPvtiPB4cA==}
    engines: {node: '>=20.9.0'}
    cpu: [x64]
    os: [linux]

  '@img/sharp-linuxmusl-arm64@0.35.3':
    resolution: {integrity: sha512-Vz0iQjzzcSX3HCbfwFfCSG/9SCIqyO0mH2sXyiHaAYfBk0cRsCWXRyQYX0ovCK/PAQBbTzQ0dsPQHh5MAFL59w==}
    engines: {node: '>=20.9.0'}
    cpu: [arm64]
    os: [linux]

  '@img/sharp-linuxmusl-x64@0.35.3':
    resolution: {integrity: sha512-6O1NPKcDVj9QEdg7Hx549EX8U0rp6yXQERqru6yRN7fGBn32UvIRJUlWnk+8xDCiG76hXVBbX82NZ/ZKr0euIg==}
    engines: {node: '>=20.9.0'}
    cpu: [x64]
    os: [linux]

  '@img/sharp-wasm32@0.35.3':
    resolution: {integrity: sha512-cZ0XkcYGpHZkqW6iCkqTcmUC0CD9DhD5d/qeZlZkfRBn6GnHniZXLUo5+9xw8Iv76YE6LQFN9YNBlKREcCG76w==}
    engines: {node: '>=20.9.0'}

  '@img/sharp-webcontainers-wasm32@0.35.3':
    resolution: {integrity: sha512-2rnq7bX3NzeR2T4YWgz8qiG4h3TSdMe+vN1iQXpJleSJ3SM5zQ8Fy2SyyXAWlbxpEZ2Y+Z4u1BePgJEYbSy80Q==}
    engines: {node: '>=20.9.0'}
    cpu: [wasm32]

  '@img/sharp-win32-arm64@0.35.3':
    resolution: {integrity: sha512-4bPwFdMbeC4JQ8L8LOyWp6nsHcboP5fxkp6iPOXz2Vg49R42TuMs2whkJ5OAP4/Ul035qOzy0AecOF9VOscn4w==}
    engines: {node: '>=20.9.0'}
    cpu: [arm64]
    os: [win32]

  '@img/sharp-win32-ia32@0.35.3':
    resolution: {integrity: sha512-r53mXsBN6lFUDiST764SvgwUdHAqM4rPAiDzAmf4fLoB6X/rkfyTrLCg6+g17wJJiCmB3JYgHuUldCWUIRFSXw==}
    engines: {node: ^20.9.0}
    cpu: [ia32]
    os: [win32]

  '@img/sharp-win32-x64@0.35.3':
    resolution: {integrity: sha512-D4y1vNeZrIIJCN+uHaWVtH86B+aCrdMYYjicy9pXHvbGZeGYLLSd3wdVuC37FxVXlU1ARsk84eKWfWMXGYEqvA==}
    engines: {node: '>=20.9.0'}
    cpu: [x64]
    os: [win32]

  '@isaacs/fs-minipass@4.0.1':
    resolution: {integrity: sha512-wgm9Ehl2jpeqP3zw/7mo3kRHFp5MEDhqAdwy1fTGkHAwnkGOVsgpvQhL8B5n1qlb01jV3n/bI0ZfZp5lWA1k4w==}
    engines: {node: '>=18.0.0'}

  '@jridgewell/gen-mapping@0.3.13':
    resolution: {integrity: sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==}

  '@jridgewell/remapping@2.3.5':
    resolution: {integrity: sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==}

  '@jridgewell/resolve-uri@3.1.2':
    resolution: {integrity: sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==}
    engines: {node: '>=6.0.0'}

  '@jridgewell/sourcemap-codec@1.5.5':
    resolution: {integrity: sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==}

  '@jridgewell/trace-mapping@0.3.31':
    resolution: {integrity: sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==}

  '@medv/finder@4.0.2':
    resolution: {integrity: sha512-RraNY9SCcx4KZV0Dh6BEW6XEW2swkqYca74pkFFRw6hHItSHiy+O/xMnpbofjYbzXj0tSpBGthUF1hHTsr3vIQ==}

  '@mermaid-js/parser@0.6.3':
    resolution: {integrity: sha512-lnjOhe7zyHjc+If7yT4zoedx2vo4sHaTmtkl1+or8BRTnCtDmcTpAjpzDSfCZrshM5bCoz0GyidzadJAH1xobA==}

  '@radix-ui/number@1.1.1':
    resolution: {integrity: sha512-MkKCwxlXTgz6CFoJx3pCwn07GKp36+aZyu/u2Ln2VrA5DcdyCZkASEDBTd8x5whTQQL5CiYf4prXKLcgQdv29g==}

  '@radix-ui/primitive@1.1.3':
    resolution: {integrity: sha512-JTF99U/6XIjCBo0wqkU5sK10glYe27MRRsfwoiq5zzOEZLHU3A3KCMa5X/azekYRCJ0HlwI0crAXS/5dEHTzDg==}

  '@radix-ui/react-accordion@1.2.12':
    resolution: {integrity: sha512-T4nygeh9YE9dLRPhAHSeOZi7HBXo+0kYIPJXayZfvWOWA0+n3dESrZbjfDPUABkUNym6Hd+f2IR113To8D2GPA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-alert-dialog@1.1.15':
    resolution: {integrity: sha512-oTVLkEw5GpdRe29BqJ0LSDFWI3qu0vR1M0mUkOQWDIUnY/QIkLpgDMWuKxP94c2NAC2LGcgVhG1ImF3jkZ5wXw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-arrow@1.1.7':
    resolution: {integrity: sha512-F+M1tLhO+mlQaOWspE8Wstg+z6PwxwRd8oQ8IXceWz92kfAmalTRf0EjrouQeo7QssEPfCn05B4Ihs1K9WQ/7w==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-aspect-ratio@1.1.7':
    resolution: {integrity: sha512-Yq6lvO9HQyPwev1onK1daHCHqXVLzPhSVjmsNjCa2Zcxy2f7uJD2itDtxknv6FzAKCwD1qQkeVDmX/cev13n/g==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-avatar@1.1.10':
    resolution: {integrity: sha512-V8piFfWapM5OmNCXTzVQY+E1rDa53zY+MQ4Y7356v4fFz6vqCyUtIz2rUD44ZEdwg78/jKmMJHj07+C/Z/rcog==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-checkbox@1.3.3':
    resolution: {integrity: sha512-wBbpv+NQftHDdG86Qc0pIyXk5IR3tM8Vd0nWLKDcX8nNn4nXFOFwsKuqw2okA/1D/mpaAkmuyndrPJTYDNZtFw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-collapsible@1.1.12':
    resolution: {integrity: sha512-Uu+mSh4agx2ib1uIGPP4/CKNULyajb3p92LsVXmH2EHVMTfZWpll88XJ0j4W0z3f8NK1eYl1+Mf/szHPmcHzyA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-collection@1.1.7':
    resolution: {integrity: sha512-Fh9rGN0MoI4ZFUNyfFVNU4y9LUz93u9/0K+yLgA2bwRojxM8JU1DyvvMBabnZPBgMWREAJvU2jjVzq+LrFUglw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-compose-refs@1.1.2':
    resolution: {integrity: sha512-z4eqJvfiNnFMHIIvXP3CY57y2WJs5g2v3X0zm9mEJkrkNv4rDxu+sg9Jh8EkXyeqBkB7SOcboo9dMVqhyrACIg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-context-menu@2.2.16':
    resolution: {integrity: sha512-O8morBEW+HsVG28gYDZPTrT9UUovQUlJue5YO836tiTJhuIWBm/zQHc7j388sHWtdH/xUZurK9olD2+pcqx5ww==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-context@1.1.2':
    resolution: {integrity: sha512-jCi/QKUM2r1Ju5a3J64TH2A5SpKAgh0LpknyqdQ4m6DCV0xJ2HG1xARRwNGPQfi1SLdLWZ1OJz6F4OMBBNiGJA==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-dialog@1.1.15':
    resolution: {integrity: sha512-TCglVRtzlffRNxRMEyR36DGBLJpeusFcgMVD9PZEzAKnUs1lKCgX5u9BmC2Yg+LL9MgZDugFFs1Vl+Jp4t/PGw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-direction@1.1.1':
    resolution: {integrity: sha512-1UEWRX6jnOA2y4H5WczZ44gOOjTEmlqv1uNW4GAJEO5+bauCBhv8snY65Iw5/VOS/ghKN9gr2KjnLKxrsvoMVw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-dismissable-layer@1.1.11':
    resolution: {integrity: sha512-Nqcp+t5cTB8BinFkZgXiMJniQH0PsUt2k51FUhbdfeKvc4ACcG2uQniY/8+h1Yv6Kza4Q7lD7PQV0z0oicE0Mg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-dropdown-menu@2.1.16':
    resolution: {integrity: sha512-1PLGQEynI/3OX/ftV54COn+3Sud/Mn8vALg2rWnBLnRaGtJDduNW/22XjlGgPdpcIbiQxjKtb7BkcjP00nqfJw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-focus-guards@1.1.3':
    resolution: {integrity: sha512-0rFg/Rj2Q62NCm62jZw0QX7a3sz6QCQU0LpZdNrJX8byRGaGVTqbrW9jAoIAHyMQqsNpeZ81YgSizOt5WXq0Pw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-focus-scope@1.1.7':
    resolution: {integrity: sha512-t2ODlkXBQyn7jkl6TNaw/MtVEVvIGelJDCG41Okq/KwUsJBwQ4XVZsHAVUkK4mBv3ewiAS3PGuUWuY2BoK4ZUw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-hover-card@1.1.15':
    resolution: {integrity: sha512-qgTkjNT1CfKMoP0rcasmlH2r1DAiYicWsDsufxl940sT2wHNEWWv6FMWIQXWhVdmC1d/HYfbhQx60KYyAtKxjg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-id@1.1.1':
    resolution: {integrity: sha512-kGkGegYIdQsOb4XjsfM97rXsiHaBwco+hFI66oO4s9LU+PLAC5oJ7khdOVFxkhsmlbpUqDAvXw11CluXP+jkHg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-label@2.1.7':
    resolution: {integrity: sha512-YT1GqPSL8kJn20djelMX7/cTRp/Y9w5IZHvfxQTVHrOqa2yMl7i/UfMqKRU5V7mEyKTrUVgJXhNQPVCG8PBLoQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-menu@2.1.16':
    resolution: {integrity: sha512-72F2T+PLlphrqLcAotYPp0uJMr5SjP5SL01wfEspJbru5Zs5vQaSHb4VB3ZMJPimgHHCHG7gMOeOB9H3Hdmtxg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-menubar@1.1.16':
    resolution: {integrity: sha512-EB1FktTz5xRRi2Er974AUQZWg2yVBb1yjip38/lgwtCVRd3a+maUoGHN/xs9Yv8SY8QwbSEb+YrxGadVWbEutA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-navigation-menu@1.2.14':
    resolution: {integrity: sha512-YB9mTFQvCOAQMHU+C/jVl96WmuWeltyUEpRJJky51huhds5W2FQr1J8D/16sQlf0ozxkPK8uF3niQMdUwZPv5w==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-popover@1.1.15':
    resolution: {integrity: sha512-kr0X2+6Yy/vJzLYJUPCZEc8SfQcf+1COFoAqauJm74umQhta9M7lNJHP7QQS3vkvcGLQUbWpMzwrXYwrYztHKA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-popper@1.2.8':
    resolution: {integrity: sha512-0NJQ4LFFUuWkE7Oxf0htBKS6zLkkjBH+hM1uk7Ng705ReR8m/uelduy1DBo0PyBXPKVnBA6YBlU94MBGXrSBCw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-portal@1.1.9':
    resolution: {integrity: sha512-bpIxvq03if6UNwXZ+HTK71JLh4APvnXntDc6XOX8UVq4XQOVl7lwok0AvIl+b8zgCw3fSaVTZMpAPPagXbKmHQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-presence@1.1.5':
    resolution: {integrity: sha512-/jfEwNDdQVBCNvjkGit4h6pMOzq8bHkopq458dPt2lMjx+eBQUohZNG9A7DtO/O5ukSbxuaNGXMjHicgwy6rQQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-primitive@2.1.3':
    resolution: {integrity: sha512-m9gTwRkhy2lvCPe6QJp4d3G1TYEUHn/FzJUtq9MjH46an1wJU+GdoGC5VLof8RX8Ft/DlpshApkhswDLZzHIcQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-progress@1.1.7':
    resolution: {integrity: sha512-vPdg/tF6YC/ynuBIJlk1mm7Le0VgW6ub6J2UWnTQ7/D23KXcPI1qy+0vBkgKgd38RCMJavBXpB83HPNFMTb0Fg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-radio-group@1.3.8':
    resolution: {integrity: sha512-VBKYIYImA5zsxACdisNQ3BjCBfmbGH3kQlnFVqlWU4tXwjy7cGX8ta80BcrO+WJXIn5iBylEH3K6ZTlee//lgQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-roving-focus@1.1.11':
    resolution: {integrity: sha512-7A6S9jSgm/S+7MdtNDSb+IU859vQqJ/QAtcYQcfFC6W8RS4IxIZDldLR0xqCFZ6DCyrQLjLPsxtTNch5jVA4lA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-scroll-area@1.2.10':
    resolution: {integrity: sha512-tAXIa1g3sM5CGpVT0uIbUx/U3Gs5N8T52IICuCtObaos1S8fzsrPXG5WObkQN3S6NVl6wKgPhAIiBGbWnvc97A==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-select@2.2.6':
    resolution: {integrity: sha512-I30RydO+bnn2PQztvo25tswPH+wFBjehVGtmagkU78yMdwTwVf12wnAOF+AeP8S2N8xD+5UPbGhkUfPyvT+mwQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-separator@1.1.7':
    resolution: {integrity: sha512-0HEb8R9E8A+jZjvmFCy/J4xhbXy3TV+9XSnGJ3KvTtjlIUy/YQ/p6UYZvi7YbeoeXdyU9+Y3scizK6hkY37baA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-slider@1.3.6':
    resolution: {integrity: sha512-JPYb1GuM1bxfjMRlNLE+BcmBC8onfCi60Blk7OBqi2MLTFdS+8401U4uFjnwkOr49BLmXxLC6JHkvAsx5OJvHw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-slot@1.2.3':
    resolution: {integrity: sha512-aeNmHnBxbi2St0au6VBVC7JXFlhLlOnvIIlePNniyUNAClzmtAUEY8/pBiK3iHjufOlwA+c20/8jngo7xcrg8A==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-switch@1.2.6':
    resolution: {integrity: sha512-bByzr1+ep1zk4VubeEVViV592vu2lHE2BZY5OnzehZqOOgogN80+mNtCqPkhn2gklJqOpxWgPoYTSnhBCqpOXQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-tabs@1.1.13':
    resolution: {integrity: sha512-7xdcatg7/U+7+Udyoj2zodtI9H/IIopqo+YOIcZOq1nJwXWBZ9p8xiu5llXlekDbZkca79a/fozEYQXIA4sW6A==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-toggle-group@1.1.11':
    resolution: {integrity: sha512-5umnS0T8JQzQT6HbPyO7Hh9dgd82NmS36DQr+X/YJ9ctFNCiiQd6IJAYYZ33LUwm8M+taCz5t2ui29fHZc4Y6Q==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-toggle@1.1.10':
    resolution: {integrity: sha512-lS1odchhFTeZv3xwHH31YPObmJn8gOg7Lq12inrr0+BH/l3Tsq32VfjqH1oh80ARM3mlkfMic15n0kg4sD1poQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-tooltip@1.2.8':
    resolution: {integrity: sha512-tY7sVt1yL9ozIxvmbtN5qtmH2krXcBCfjEiCgKGLqunJHvgvZG2Pcl2oQ3kbcZARb1BGEHdkLzcYGO8ynVlieg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-use-callback-ref@1.1.1':
    resolution: {integrity: sha512-FkBMwD+qbGQeMu1cOHnuGB6x4yzPjho8ap5WtbEJ26umhgqVXbhekKUQO+hZEL1vU92a3wHwdp0HAcqAUF5iDg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-controllable-state@1.2.2':
    resolution: {integrity: sha512-BjasUjixPFdS+NKkypcyyN5Pmg83Olst0+c6vGov0diwTEo6mgdqVR6hxcEgFuh4QrAs7Rc+9KuGJ9TVCj0Zzg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-effect-event@0.0.2':
    resolution: {integrity: sha512-Qp8WbZOBe+blgpuUT+lw2xheLP8q0oatc9UpmiemEICxGvFLYmHm9QowVZGHtJlGbS6A6yJ3iViad/2cVjnOiA==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-escape-keydown@1.1.1':
    resolution: {integrity: sha512-Il0+boE7w/XebUHyBjroE+DbByORGR9KKmITzbR7MyQ4akpORYP/ZmbhAr0DG7RmmBqoOnZdy2QlvajJ2QA59g==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-is-hydrated@0.1.0':
    resolution: {integrity: sha512-U+UORVEq+cTnRIaostJv9AGdV3G6Y+zbVd+12e18jQ5A3c0xL03IhnHuiU4UV69wolOQp5GfR58NW/EgdQhwOA==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-layout-effect@1.1.1':
    resolution: {integrity: sha512-RbJRS4UWQFkzHTTwVymMTUv8EqYhOp8dOOviLj2ugtTiXRaRQS7GLGxZTLL1jWhMeoSCf5zmcZkqTl9IiYfXcQ==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-previous@1.1.1':
    resolution: {integrity: sha512-2dHfToCj/pzca2Ck724OZ5L0EVrr3eHRNsG/b3xQJLA2hZpVCS99bLAX+hm1IHXDEnzU6by5z/5MIY794/a8NQ==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-rect@1.1.1':
    resolution: {integrity: sha512-QTYuDesS0VtuHNNvMh+CjlKJ4LJickCMUAqjlE3+j8w+RlRpwyX3apEQKGFzbZGdo7XNG1tXa+bQqIE7HIXT2w==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-size@1.1.1':
    resolution: {integrity: sha512-ewrXRDTAqAXlkl6t/fkXWNAhFX9I+CkKlw6zjEwk86RSPKwZr3xpBRso655aqYafwtnbpHLj6toFzmd6xdVptQ==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-visually-hidden@1.2.3':
    resolution: {integrity: sha512-pzJq12tEaaIhqjbzpCuv/OypJY/BPavOofm+dbab+MHLajy277+1lLm6JFcGgF5eskJ6mquGirhXY2GD/8u8Ug==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/rect@1.1.1':
    resolution: {integrity: sha512-HPwpGIzkl28mWyZqG52jiqDJ12waP11Pa1lGoiyUkIEuMLBP0oeK/C89esbXrxsky5we7dfd8U58nm0SgAWpVw==}

  '@rolldown/pluginutils@1.0.0-beta.38':
    resolution: {integrity: sha512-N/ICGKleNhA5nc9XXQG/kkKHJ7S55u0x0XUJbbkmdCnFuoRkM1Il12q9q0eX19+M7KKUEPw/daUPIRnxhcxAIw==}

  '@rollup/rollup-android-arm-eabi@4.52.4':
    resolution: {integrity: sha512-BTm2qKNnWIQ5auf4deoetINJm2JzvihvGb9R6K/ETwKLql/Bb3Eg2H1FBp1gUb4YGbydMA3jcmQTR73q7J+GAA==}
    cpu: [arm]
    os: [android]

  '@rollup/rollup-android-arm64@4.52.4':
    resolution: {integrity: sha512-P9LDQiC5vpgGFgz7GSM6dKPCiqR3XYN1WwJKA4/BUVDjHpYsf3iBEmVz62uyq20NGYbiGPR5cNHI7T1HqxNs2w==}
    cpu: [arm64]
    os: [android]

  '@rollup/rollup-darwin-arm64@4.52.4':
    resolution: {integrity: sha512-QRWSW+bVccAvZF6cbNZBJwAehmvG9NwfWHwMy4GbWi/BQIA/laTIktebT2ipVjNncqE6GLPxOok5hsECgAxGZg==}
    cpu: [arm64]
    os: [darwin]

  '@rollup/rollup-darwin-x64@4.52.4':
    resolution: {integrity: sha512-hZgP05pResAkRJxL1b+7yxCnXPGsXU0fG9Yfd6dUaoGk+FhdPKCJ5L1Sumyxn8kvw8Qi5PvQ8ulenUbRjzeCTw==}
    cpu: [x64]
    os: [darwin]

  '@rollup/rollup-freebsd-arm64@4.52.4':
    resolution: {integrity: sha512-xmc30VshuBNUd58Xk4TKAEcRZHaXlV+tCxIXELiE9sQuK3kG8ZFgSPi57UBJt8/ogfhAF5Oz4ZSUBN77weM+mQ==}
    cpu: [arm64]
    os: [freebsd]

  '@rollup/rollup-freebsd-x64@4.52.4':
    resolution: {integrity: sha512-WdSLpZFjOEqNZGmHflxyifolwAiZmDQzuOzIq9L27ButpCVpD7KzTRtEG1I0wMPFyiyUdOO+4t8GvrnBLQSwpw==}
    cpu: [x64]
    os: [freebsd]

  '@rollup/rollup-linux-arm-gnueabihf@4.52.4':
    resolution: {integrity: sha512-xRiOu9Of1FZ4SxVbB0iEDXc4ddIcjCv2aj03dmW8UrZIW7aIQ9jVJdLBIhxBI+MaTnGAKyvMwPwQnoOEvP7FgQ==}
    cpu: [arm]
    os: [linux]

  '@rollup/rollup-linux-arm-musleabihf@4.52.4':
    resolution: {integrity: sha512-FbhM2p9TJAmEIEhIgzR4soUcsW49e9veAQCziwbR+XWB2zqJ12b4i/+hel9yLiD8pLncDH4fKIPIbt5238341Q==}
    cpu: [arm]
    os: [linux]

  '@rollup/rollup-linux-arm64-gnu@4.52.4':
    resolution: {integrity: sha512-4n4gVwhPHR9q/g8lKCyz0yuaD0MvDf7dV4f9tHt0C73Mp8h38UCtSCSE6R9iBlTbXlmA8CjpsZoujhszefqueg==}
    cpu: [arm64]
    os: [linux]

  '@rollup/rollup-linux-arm64-musl@4.52.4':
    resolution: {integrity: sha512-u0n17nGA0nvi/11gcZKsjkLj1QIpAuPFQbR48Subo7SmZJnGxDpspyw2kbpuoQnyK+9pwf3pAoEXerJs/8Mi9g==}
    cpu: [arm64]
    os: [linux]

  '@rollup/rollup-linux-loong64-gnu@4.52.4':
    resolution: {integrity: sha512-0G2c2lpYtbTuXo8KEJkDkClE/+/2AFPdPAbmaHoE870foRFs4pBrDehilMcrSScrN/fB/1HTaWO4bqw+ewBzMQ==}
    cpu: [loong64]
    os: [linux]

  '@rollup/rollup-linux-ppc64-gnu@4.52.4':
    resolution: {integrity: sha512-teSACug1GyZHmPDv14VNbvZFX779UqWTsd7KtTM9JIZRDI5NUwYSIS30kzI8m06gOPB//jtpqlhmraQ68b5X2g==}
    cpu: [ppc64]
    os: [linux]

  '@rollup/rollup-linux-riscv64-gnu@4.52.4':
    resolution: {integrity: sha512-/MOEW3aHjjs1p4Pw1Xk4+3egRevx8Ji9N6HUIA1Ifh8Q+cg9dremvFCUbOX2Zebz80BwJIgCBUemjqhU5XI5Eg==}
    cpu: [riscv64]
    os: [linux]

  '@rollup/rollup-linux-riscv64-musl@4.52.4':
    resolution: {integrity: sha512-1HHmsRyh845QDpEWzOFtMCph5Ts+9+yllCrREuBR/vg2RogAQGGBRC8lDPrPOMnrdOJ+mt1WLMOC2Kao/UwcvA==}
    cpu: [riscv64]
    os: [linux]

  '@rollup/rollup-linux-s390x-gnu@4.52.4':
    resolution: {integrity: sha512-seoeZp4L/6D1MUyjWkOMRU6/iLmCU2EjbMTyAG4oIOs1/I82Y5lTeaxW0KBfkUdHAWN7j25bpkt0rjnOgAcQcA==}
    cpu: [s390x]
    os: [linux]

  '@rollup/rollup-linux-x64-gnu@4.52.4':
    resolution: {integrity: sha512-Wi6AXf0k0L7E2gteNsNHUs7UMwCIhsCTs6+tqQ5GPwVRWMaflqGec4Sd8n6+FNFDw9vGcReqk2KzBDhCa1DLYg==}
    cpu: [x64]
    os: [linux]

  '@rollup/rollup-linux-x64-musl@4.52.4':
    resolution: {integrity: sha512-dtBZYjDmCQ9hW+WgEkaffvRRCKm767wWhxsFW3Lw86VXz/uJRuD438/XvbZT//B96Vs8oTA8Q4A0AfHbrxP9zw==}
    cpu: [x64]
    os: [linux]

  '@rollup/rollup-openharmony-arm64@4.52.4':
    resolution: {integrity: sha512-1ox+GqgRWqaB1RnyZXL8PD6E5f7YyRUJYnCqKpNzxzP0TkaUh112NDrR9Tt+C8rJ4x5G9Mk8PQR3o7Ku2RKqKA==}
    cpu: [arm64]
    os: [openharmony]

  '@rollup/rollup-win32-arm64-msvc@4.52.4':
    resolution: {integrity: sha512-8GKr640PdFNXwzIE0IrkMWUNUomILLkfeHjXBi/nUvFlpZP+FA8BKGKpacjW6OUUHaNI6sUURxR2U2g78FOHWQ==}
    cpu: [arm64]
    os: [win32]

  '@rollup/rollup-win32-ia32-msvc@4.52.4':
    resolution: {integrity: sha512-AIy/jdJ7WtJ/F6EcfOb2GjR9UweO0n43jNObQMb6oGxkYTfLcnN7vYYpG+CN3lLxrQkzWnMOoNSHTW54pgbVxw==}
    cpu: [ia32]
    os: [win32]

  '@rollup/rollup-win32-x64-gnu@4.52.4':
    resolution: {integrity: sha512-UF9KfsH9yEam0UjTwAgdK0anlQ7c8/pWPU2yVjyWcF1I1thABt6WXE47cI71pGiZ8wGvxohBoLnxM04L/wj8mQ==}
    cpu: [x64]
    os: [win32]

  '@rollup/rollup-win32-x64-msvc@4.52.4':
    resolution: {integrity: sha512-bf9PtUa0u8IXDVxzRToFQKsNCRz9qLYfR/MpECxl4mRoWYjAeFjgxj1XdZr2M/GNVpT05p+LgQOHopYDlUu6/w==}
    cpu: [x64]
    os: [win32]

  '@shikijs/core@3.14.0':
    resolution: {integrity: sha512-qRSeuP5vlYHCNUIrpEBQFO7vSkR7jn7Kv+5X3FO/zBKVDGQbcnlScD3XhkrHi/R8Ltz0kEjvFR9Szp/XMRbFMw==}

  '@shikijs/engine-javascript@3.14.0':
    resolution: {integrity: sha512-3v1kAXI2TsWQuwv86cREH/+FK9Pjw3dorVEykzQDhwrZj0lwsHYlfyARaKmn6vr5Gasf8aeVpb8JkzeWspxOLQ==}

  '@shikijs/engine-oniguruma@3.14.0':
    resolution: {integrity: sha512-TNcYTYMbJyy+ZjzWtt0bG5y4YyMIWC2nyePz+CFMWqm+HnZZyy9SWMgo8Z6KBJVIZnx8XUXS8U2afO6Y0g1Oug==}

  '@shikijs/langs@3.14.0':
    resolution: {integrity: sha512-DIB2EQY7yPX1/ZH7lMcwrK5pl+ZkP/xoSpUzg9YC8R+evRCCiSQ7yyrvEyBsMnfZq4eBzLzBlugMyTAf13+pzg==}

  '@shikijs/themes@3.14.0':
    resolution: {integrity: sha512-fAo/OnfWckNmv4uBoUu6dSlkcBc+SA1xzj5oUSaz5z3KqHtEbUypg/9xxgJARtM6+7RVm0Q6Xnty41xA1ma1IA==}

  '@shikijs/types@3.14.0':
    resolution: {integrity: sha512-bQGgC6vrY8U/9ObG1Z/vTro+uclbjjD/uG58RvfxKZVD5p9Yc1ka3tVyEFy7BNJLzxuWyHH5NWynP9zZZS59eQ==}

  '@shikijs/vscode-textmate@10.0.2':
    resolution: {integrity: sha512-83yeghZ2xxin3Nj8z1NMd/NCuca+gsYXswywDy5bHvwlWL8tpTQmzGeUuHd9FC3E/SBEMvzJRwWEOz5gGes9Qg==}

  '@smithy/core@3.33.2':
    resolution: {integrity: sha512-CUGXpnPkVdjUCbix+83sWLW9VFgQOm44MDOx/ihITJMAnOZKvL8YYIc7DR9pP/tZ8CIRvMiON/TucvygqbHO3w==}
    engines: {node: '>=18.0.0'}

  '@smithy/credential-provider-imds@4.5.2':
    resolution: {integrity: sha512-A9uSdn72ozbRUSit0eib0TW7nXuNPlaeM0zcGkJ+nE6tFcSDbnmtwoxbTCFBukVQcszDAyvsd7+rTduPTXpygg==}
    engines: {node: '>=18.0.0'}

  '@smithy/fetch-http-handler@5.7.2':
    resolution: {integrity: sha512-nZyWTmSpJEXl6VtWVMBJve/7x12DZu6sIX1z1a+ZMaHlQQRs9Zpu6NbTe/gmxYXVRpkjxyDYpZ5gx2IM6f/Wkw==}
    engines: {node: '>=18.0.0'}

  '@smithy/node-http-handler@4.11.2':
    resolution: {integrity: sha512-avwAh9HM3h2lcfjvP3zYIZGf+XVgLQ91wOJ2qoFbNpW1UZeZb33aGlhTZvtkANHfcGhJroRY64525OjfgOg30g==}
    engines: {node: '>=18.0.0'}

  '@smithy/signature-v4@5.7.2':
    resolution: {integrity: sha512-P7Ki6px6OOrxVtx8K7nLmyx4SlXUW/uTKDdMG44UHefmPGSRMBKe2v+TM59WdLcpUIrBrnuCsIqiM2MbsZjmhw==}
    engines: {node: '>=18.0.0'}

  '@smithy/types@4.17.2':
    resolution: {integrity: sha512-FOKpVZob9MPTn2znRzGrnsMHv7BOsKVw3XiP/cOyYLDVZ9qKp4nifIiSCuUU/fIj5Vu0UOAxCFr+qRAtG0NUkA==}
    engines: {node: '>=18.0.0'}

  '@standard-schema/utils@0.3.0':
    resolution: {integrity: sha512-e7Mew686owMaPJVNNLs55PUvgz371nKgwsc4vxE49zsODpJEnxgxRo2y/OKrqueavXgZNMDVj3DdHFlaSAeU8g==}

  '@tailwindcss/node@4.1.14':
    resolution: {integrity: sha512-hpz+8vFk3Ic2xssIA3e01R6jkmsAhvkQdXlEbRTk6S10xDAtiQiM3FyvZVGsucefq764euO/b8WUW9ysLdThHw==}

  '@tailwindcss/oxide-android-arm64@4.1.14':
    resolution: {integrity: sha512-a94ifZrGwMvbdeAxWoSuGcIl6/DOP5cdxagid7xJv6bwFp3oebp7y2ImYsnZBMTwjn5Ev5xESvS3FFYUGgPODQ==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [android]

  '@tailwindcss/oxide-darwin-arm64@4.1.14':
    resolution: {integrity: sha512-HkFP/CqfSh09xCnrPJA7jud7hij5ahKyWomrC3oiO2U9i0UjP17o9pJbxUN0IJ471GTQQmzwhp0DEcpbp4MZTA==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [darwin]

  '@tailwindcss/oxide-darwin-x64@4.1.14':
    resolution: {integrity: sha512-eVNaWmCgdLf5iv6Qd3s7JI5SEFBFRtfm6W0mphJYXgvnDEAZ5sZzqmI06bK6xo0IErDHdTA5/t7d4eTfWbWOFw==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [darwin]

  '@tailwindcss/oxide-freebsd-x64@4.1.14':
    resolution: {integrity: sha512-QWLoRXNikEuqtNb0dhQN6wsSVVjX6dmUFzuuiL09ZeXju25dsei2uIPl71y2Ic6QbNBsB4scwBoFnlBfabHkEw==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [freebsd]

  '@tailwindcss/oxide-linux-arm-gnueabihf@4.1.14':
    resolution: {integrity: sha512-VB4gjQni9+F0VCASU+L8zSIyjrLLsy03sjcR3bM0V2g4SNamo0FakZFKyUQ96ZVwGK4CaJsc9zd/obQy74o0Fw==}
    engines: {node: '>= 10'}
    cpu: [arm]
    os: [linux]

  '@tailwindcss/oxide-linux-arm64-gnu@4.1.14':
    resolution: {integrity: sha512-qaEy0dIZ6d9vyLnmeg24yzA8XuEAD9WjpM5nIM1sUgQ/Zv7cVkharPDQcmm/t/TvXoKo/0knI3me3AGfdx6w1w==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [linux]

  '@tailwindcss/oxide-linux-arm64-musl@4.1.14':
    resolution: {integrity: sha512-ISZjT44s59O8xKsPEIesiIydMG/sCXoMBCqsphDm/WcbnuWLxxb+GcvSIIA5NjUw6F8Tex7s5/LM2yDy8RqYBQ==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [linux]

  '@tailwindcss/oxide-linux-x64-gnu@4.1.14':
    resolution: {integrity: sha512-02c6JhLPJj10L2caH4U0zF8Hji4dOeahmuMl23stk0MU1wfd1OraE7rOloidSF8W5JTHkFdVo/O7uRUJJnUAJg==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [linux]

  '@tailwindcss/oxide-linux-x64-musl@4.1.14':
    resolution: {integrity: sha512-TNGeLiN1XS66kQhxHG/7wMeQDOoL0S33x9BgmydbrWAb9Qw0KYdd8o1ifx4HOGDWhVmJ+Ul+JQ7lyknQFilO3Q==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [linux]

  '@tailwindcss/oxide-wasm32-wasi@4.1.14':
    resolution: {integrity: sha512-uZYAsaW/jS/IYkd6EWPJKW/NlPNSkWkBlaeVBi/WsFQNP05/bzkebUL8FH1pdsqx4f2fH/bWFcUABOM9nfiJkQ==}
    engines: {node: '>=14.0.0'}
    cpu: [wasm32]
    bundledDependencies:
      - '@napi-rs/wasm-runtime'
      - '@emnapi/core'
      - '@emnapi/runtime'
      - '@tybys/wasm-util'
      - '@emnapi/wasi-threads'
      - tslib

  '@tailwindcss/oxide-win32-arm64-msvc@4.1.14':
    resolution: {integrity: sha512-Az0RnnkcvRqsuoLH2Z4n3JfAef0wElgzHD5Aky/e+0tBUxUhIeIqFBTMNQvmMRSP15fWwmvjBxZ3Q8RhsDnxAA==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [win32]

  '@tailwindcss/oxide-win32-x64-msvc@4.1.14':
    resolution: {integrity: sha512-ttblVGHgf68kEE4om1n/n44I0yGPkCPbLsqzjvybhpwa6mKKtgFfAzy6btc3HRmuW7nHe0OOrSeNP9sQmmH9XA==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [win32]

  '@tailwindcss/oxide@4.1.14':
    resolution: {integrity: sha512-23yx+VUbBwCg2x5XWdB8+1lkPajzLmALEfMb51zZUBYaYVPDQvBSD/WYDqiVyBIo2BZFa3yw1Rpy3G2Jp+K0dw==}
    engines: {node: '>= 10'}

  '@tailwindcss/typography@0.5.19':
    resolution: {integrity: sha512-w31dd8HOx3k9vPtcQh5QHP9GwKcgbMp87j58qi6xgiBnFFtKEAgCWnDw4qUT8aHwkCp8bKvb/KGKWWHedP0AAg==}
    peerDependencies:
      tailwindcss: '>=3.0.0 || insiders || >=4.0.0-alpha.20 || >=4.0.0-beta.1'

  '@tailwindcss/vite@4.1.14':
    resolution: {integrity: sha512-BoFUoU0XqgCUS1UXWhmDJroKKhNXeDzD7/XwabjkDIAbMnc4ULn5e2FuEuBbhZ6ENZoSYzKlzvZ44Yr6EUDUSA==}
    peerDependencies:
      vite: ^5.2.0 || ^6 || ^7

  '@tanstack/query-core@5.101.4':
    resolution: {integrity: sha512-gNwcvOJcRbLWPOLG/2OBm+zM+Yv+MKsXKEOWC57USuZDEsI71hEErQsiEGx5wX9rzWWkfwM0fVSPoiIFSsxfiw==}

  '@tanstack/react-query@5.101.4':
    resolution: {integrity: sha512-yRg2pfOCxIs4ZJW3XYYHU/WgtD04FHSnfHlpRT7h7pR77hwkdRG4wxbKe4aq6P0RvXUTBSQpQeadS1SUYUe+KA==}
    peerDependencies:
      react: ^18 || ^19

  '@trpc/client@11.18.0':
    resolution: {integrity: sha512-wOqeg3Fvl25V1ZisQhUD3K8G60ZJDlSGJNSyeXrLH24xAo5w6GSR2Kzb1cSNY9Y+IQ2YZvYGZstBU+V/ulo/ow==}
    hasBin: true
    peerDependencies:
      '@trpc/server': 11.18.0
      typescript: '>=5.7.2'

  '@trpc/react-query@11.18.0':
    resolution: {integrity: sha512-C1+Wwm2pCeUJucI+bnFpxGYjNuvV+ko1BC1T9tUxBVdrhHRCdn9ubxdevdLSAa49XRJRJiZnSuzl3Ys/yvs1vg==}
    peerDependencies:
      '@tanstack/react-query': ^5.80.3
      '@trpc/client': 11.18.0
      '@trpc/server': 11.18.0
      react: '>=18.2.0'
      typescript: '>=5.7.2'

  '@trpc/server@11.18.0':
    resolution: {integrity: sha512-JAvXOuNTxgXjIDfQaOvDq1j66LMNfDJUH1IU7Slfn8EvRv2EkH6ehu3A7zpYhjO0syHHiYg77v2lG2JFJgvw7Q==}
    hasBin: true
    peerDependencies:
      typescript: '>=5.7.2'

  '@types/babel__core@7.20.5':
    resolution: {integrity: sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA==}

  '@types/babel__generator@7.27.0':
    resolution: {integrity: sha512-ufFd2Xi92OAVPYsy+P4n7/U7e68fex0+Ee8gSG9KX7eo084CWiQ4sdxktvdl0bOPupXtVJPY19zk6EwWqUQ8lg==}

  '@types/babel__template@7.4.4':
    resolution: {integrity: sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A==}

  '@types/babel__traverse@7.28.0':
    resolution: {integrity: sha512-8PvcXf70gTDZBgt9ptxJ8elBeBjcLOAcOtoO/mPJjtji1+CdGbHgm77om1GrsPxsiE+uXIpNSK64UYaIwQXd4Q==}

  '@types/body-parser@1.19.6':
    resolution: {integrity: sha512-HLFeCYgz89uk22N5Qg3dvGvsv46B8GLvKKo1zKG4NybA8U2DiEO3w9lqGg29t/tfLRJpJ6iQxnVw4OnB7MoM9g==}

  '@types/connect@3.4.38':
    resolution: {integrity: sha512-K6uROf1LD88uDQqJCktA4yzL1YYAK6NgfsI0v/mTgyPKWsX1CnJ0XPSDhViejru1GcRkLWb8RlzFYJRqGUbaug==}

  '@types/d3-array@3.2.2':
    resolution: {integrity: sha512-hOLWVbm7uRza0BYXpIIW5pxfrKe0W+D5lrFiAEYR+pb6w3N2SwSMaJbXdUfSEv+dT4MfHBLtn5js0LAWaO6otw==}

  '@types/d3-axis@3.0.6':
    resolution: {integrity: sha512-pYeijfZuBd87T0hGn0FO1vQ/cgLk6E1ALJjfkC0oJ8cbwkZl3TpgS8bVBLZN+2jjGgg38epgxb2zmoGtSfvgMw==}

  '@types/d3-brush@3.0.6':
    resolution: {integrity: sha512-nH60IZNNxEcrh6L1ZSMNA28rj27ut/2ZmI3r96Zd+1jrZD++zD3LsMIjWlvg4AYrHn/Pqz4CF3veCxGjtbqt7A==}

  '@types/d3-chord@3.0.6':
    resolution: {integrity: sha512-LFYWWd8nwfwEmTZG9PfQxd17HbNPksHBiJHaKuY1XeqscXacsS2tyoo6OdRsjf+NQYeB6XrNL3a25E3gH69lcg==}

  '@types/d3-color@3.1.3':
    resolution: {integrity: sha512-iO90scth9WAbmgv7ogoq57O9YpKmFBbmoEoCHDB2xMBY0+/KVrqAaCDyCE16dUspeOvIxFFRI+0sEtqDqy2b4A==}

  '@types/d3-contour@3.0.6':
    resolution: {integrity: sha512-BjzLgXGnCWjUSYGfH1cpdo41/hgdWETu4YxpezoztawmqsvCeep+8QGfiY6YbDvfgHz/DkjeIkkZVJavB4a3rg==}

  '@types/d3-delaunay@6.0.4':
    resolution: {integrity: sha512-ZMaSKu4THYCU6sV64Lhg6qjf1orxBthaC161plr5KuPHo3CNm8DTHiLw/5Eq2b6TsNP0W0iJrUOFscY6Q450Hw==}

  '@types/d3-dispatch@3.0.7':
    resolution: {integrity: sha512-5o9OIAdKkhN1QItV2oqaE5KMIiXAvDWBDPrD85e58Qlz1c1kI/J0NcqbEG88CoTwJrYe7ntUCVfeUl2UJKbWgA==}

  '@types/d3-drag@3.0.7':
    resolution: {integrity: sha512-HE3jVKlzU9AaMazNufooRJ5ZpWmLIoc90A37WU2JMmeq28w1FQqCZswHZ3xR+SuxYftzHq6WU6KJHvqxKzTxxQ==}

  '@types/d3-dsv@3.0.7':
    resolution: {integrity: sha512-n6QBF9/+XASqcKK6waudgL0pf/S5XHPPI8APyMLLUHd8NqouBGLsU8MgtO7NINGtPBtk9Kko/W4ea0oAspwh9g==}

  '@types/d3-ease@3.0.2':
    resolution: {integrity: sha512-NcV1JjO5oDzoK26oMzbILE6HW7uVXOHLQvHshBUW4UMdZGfiY6v5BeQwh9a9tCzv+CeefZQHJt5SRgK154RtiA==}

  '@types/d3-fetch@3.0.7':
    resolution: {integrity: sha512-fTAfNmxSb9SOWNB9IoG5c8Hg6R+AzUHDRlsXsDZsNp6sxAEOP0tkP3gKkNSO/qmHPoBFTxNrjDprVHDQDvo5aA==}

  '@types/d3-force@3.0.10':
    resolution: {integrity: sha512-ZYeSaCF3p73RdOKcjj+swRlZfnYpK1EbaDiYICEEp5Q6sUiqFaFQ9qgoshp5CzIyyb/yD09kD9o2zEltCexlgw==}

  '@types/d3-format@3.0.4':
    resolution: {integrity: sha512-fALi2aI6shfg7vM5KiR1wNJnZ7r6UuggVqtDA+xiEdPZQwy/trcQaHnwShLuLdta2rTymCNpxYTiMZX/e09F4g==}

  '@types/d3-geo@3.1.0':
    resolution: {integrity: sha512-856sckF0oP/diXtS4jNsiQw/UuK5fQG8l/a9VVLeSouf1/PPbBE1i1W852zVwKwYCBkFJJB7nCFTbk6UMEXBOQ==}

  '@types/d3-hierarchy@3.1.7':
    resolution: {integrity: sha512-tJFtNoYBtRtkNysX1Xq4sxtjK8YgoWUNpIiUee0/jHGRwqvzYxkq0hGVbbOGSz+JgFxxRu4K8nb3YpG3CMARtg==}

  '@types/d3-interpolate@3.0.4':
    resolution: {integrity: sha512-mgLPETlrpVV1YRJIglr4Ez47g7Yxjl1lj7YKsiMCb27VJH9W8NVM6Bb9d8kkpG/uAQS5AmbA48q2IAolKKo1MA==}

  '@types/d3-path@3.1.1':
    resolution: {integrity: sha512-VMZBYyQvbGmWyWVea0EHs/BwLgxc+MKi1zLDCONksozI4YJMcTt8ZEuIR4Sb1MMTE8MMW49v0IwI5+b7RmfWlg==}

  '@types/d3-polygon@3.0.2':
    resolution: {integrity: sha512-ZuWOtMaHCkN9xoeEMr1ubW2nGWsp4nIql+OPQRstu4ypeZ+zk3YKqQT0CXVe/PYqrKpZAi+J9mTs05TKwjXSRA==}

  '@types/d3-quadtree@3.0.6':
    resolution: {integrity: sha512-oUzyO1/Zm6rsxKRHA1vH0NEDG58HrT5icx/azi9MF1TWdtttWl0UIUsjEQBBh+SIkrpd21ZjEv7ptxWys1ncsg==}

  '@types/d3-random@3.0.3':
    resolution: {integrity: sha512-Imagg1vJ3y76Y2ea0871wpabqp613+8/r0mCLEBfdtqC7xMSfj9idOnmBYyMoULfHePJyxMAw3nWhJxzc+LFwQ==}

  '@types/d3-scale-chromatic@3.1.0':
    resolution: {integrity: sha512-iWMJgwkK7yTRmWqRB5plb1kadXyQ5Sj8V/zYlFGMUBbIPKQScw+Dku9cAAMgJG+z5GYDoMjWGLVOvjghDEFnKQ==}

  '@types/d3-scale@4.0.9':
    resolution: {integrity: sha512-dLmtwB8zkAeO/juAMfnV+sItKjlsw2lKdZVVy6LRr0cBmegxSABiLEpGVmSJJ8O08i4+sGR6qQtb6WtuwJdvVw==}

  '@types/d3-selection@3.0.11':
    resolution: {integrity: sha512-bhAXu23DJWsrI45xafYpkQ4NtcKMwWnAC/vKrd2l+nxMFuvOT3XMYTIj2opv8vq8AO5Yh7Qac/nSeP/3zjTK0w==}

  '@types/d3-shape@3.1.7':
    resolution: {integrity: sha512-VLvUQ33C+3J+8p+Daf+nYSOsjB4GXp19/S/aGo60m9h1v6XaxjiT82lKVWJCfzhtuZ3yD7i/TPeC/fuKLLOSmg==}

  '@types/d3-time-format@4.0.3':
    resolution: {integrity: sha512-5xg9rC+wWL8kdDj153qZcsJ0FWiFt0J5RB6LYUNZjwSnesfblqrI/bJ1wBdJ8OQfncgbJG5+2F+qfqnqyzYxyg==}

  '@types/d3-time@3.0.4':
    resolution: {integrity: sha512-yuzZug1nkAAaBlBBikKZTgzCeA+k1uy4ZFwWANOfKw5z5LRhV0gNA7gNkKm7HoK+HRN0wX3EkxGk0fpbWhmB7g==}

  '@types/d3-timer@3.0.2':
    resolution: {integrity: sha512-Ps3T8E8dZDam6fUyNiMkekK3XUsaUEik+idO9/YjPtfj2qruF8tFBXS7XhtE4iIXBLxhmLjP3SXpLhVf21I9Lw==}

  '@types/d3-transition@3.0.9':
    resolution: {integrity: sha512-uZS5shfxzO3rGlu0cC3bjmMFKsXv+SmZZcgp0KD22ts4uGXp5EVYGzu/0YdwZeKmddhcAccYtREJKkPfXkZuCg==}

  '@types/d3-zoom@3.0.8':
    resolution: {integrity: sha512-iqMC4/YlFCSlO8+2Ii1GGGliCAY4XdeG748w5vQUbevlbDu0zSjH/+jojorQVBK/se0j6DUFNPBGSqD3YWYnDw==}

  '@types/d3@7.4.3':
    resolution: {integrity: sha512-lZXZ9ckh5R8uiFVt8ogUNf+pIrK4EsWrx2Np75WvF/eTpJ0FMHNhjXk8CKEx/+gpHbNQyJWehbFaTvqmHWB3ww==}

  '@types/debug@4.1.12':
    resolution: {integrity: sha512-vIChWdVG3LG1SMxEvI/AK+FWJthlrqlTu7fbrlywTkkaONwk/UAGaULXRlf8vkzFBLVm0zkMdCquhL5aOjhXPQ==}

  '@types/estree-jsx@1.0.5':
    resolution: {integrity: sha512-52CcUVNFyfb1A2ALocQw/Dd1BQFNmSdkuC3BkZ6iqhdMfQz7JWOFRuJFloOzjk+6WijU56m9oKXFAXc7o3Towg==}

  '@types/estree@1.0.8':
    resolution: {integrity: sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w==}

  '@types/express-serve-static-core@4.19.6':
    resolution: {integrity: sha512-N4LZ2xG7DatVqhCZzOGb1Yi5lMbXSZcmdLDe9EzSndPV2HpWYWzRbaerl2n27irrm94EPpprqa8KpskPT085+A==}

  '@types/express@4.17.21':
    resolution: {integrity: sha512-ejlPM315qwLpaQlQDTjPdsUFSc6ZsP4AN6AlWnogPjQ7CVi7PYF3YVz+CY3jE2pwYf7E/7HlDAN0rV2GxTG0HQ==}

  '@types/geojson@7946.0.16':
    resolution: {integrity: sha512-6C8nqWur3j98U6+lXDfTUWIfgvZU+EumvpHKcYjujKH7woYyLj2sUmff0tRhrqM7BohUw7Pz3ZB1jj2gW9Fvmg==}

  '@types/google.maps@3.58.1':
    resolution: {integrity: sha512-X9QTSvGJ0nCfMzYOnaVs/k6/4L+7F5uCS+4iUmkLEls6J9S/Phv+m/i3mDeyc49ZBgwab3EFO1HEoBY7k98EGQ==}

  '@types/hast@3.0.4':
    resolution: {integrity: sha512-WPs+bbQw5aCj+x6laNGWLH3wviHtoCv/P3+otBhbOhJgG8qtpdAMlTCxLtsTWA7LH1Oh/bFCHsBn0TPS5m30EQ==}

  '@types/http-errors@2.0.5':
    resolution: {integrity: sha512-r8Tayk8HJnX0FztbZN7oVqGccWgw98T/0neJphO91KkmOzug1KkofZURD4UaD5uH8AqcFLfdPErnBod0u71/qg==}

  '@types/jszip@3.4.1':
    resolution: {integrity: sha512-TezXjmf3lj+zQ651r6hPqvSScqBLvyPI9FxdXBqpEwBijNGQ2NXpaFW/7joGzveYkKQUil7iiDHLo6LV71Pc0A==}
    deprecated: This is a stub types definition. jszip provides its own type definitions, so you do not need this installed.

  '@types/katex@0.16.7':
    resolution: {integrity: sha512-HMwFiRujE5PjrgwHQ25+bsLJgowjGjm5Z8FVSf0N6PwgJrwxH0QxzHYDcKsTfV3wva0vzrpqMTJS2jXPr5BMEQ==}

  '@types/mdast@4.0.4':
    resolution: {integrity: sha512-kGaNbPh1k7AFzgpud/gMdvIm5xuECykRR+JnWKQno9TAXVa6WIVCGTPvYGekIDL4uwCZQSYbUxNBSb1aUo79oA==}

  '@types/mime@1.3.5':
    resolution: {integrity: sha512-/pyBZWSLD2n0dcHE3hq8s8ZvcETHtEuF+3E7XVt0Ig2nvsVQXdghHVcEkIWjy9A0wKfTn97a/PSDYohKIlnP/w==}

  '@types/ms@2.1.0':
    resolution: {integrity: sha512-GsCCIZDE/p3i96vtEqx+7dBUGXrc7zeSK3wwPHIaRThS+9OhWIXRqzs4d6k1SVU8g91DrNRWxWUGhp5KXQb2VA==}

  '@types/node@24.7.0':
    resolution: {integrity: sha512-IbKooQVqUBrlzWTi79E8Fw78l8k1RNtlDDNWsFZs7XonuQSJ8oNYfEeclhprUldXISRMLzBpILuKgPlIxm+/Yw==}

  '@types/pngjs@6.0.5':
    resolution: {integrity: sha512-0k5eKfrA83JOZPppLtS2C7OUtyNAl2wKNxfyYl9Q5g9lPkgBl/9hNyAu6HuEH2J4XmIv2znEpkDd0SaZVxW6iQ==}

  '@types/qs@6.14.0':
    resolution: {integrity: sha512-eOunJqu0K1923aExK6y8p6fsihYEn/BYuQ4g0CxAAgFc4b/ZLN4CrsRZ55srTdqoiLzU2B2evC+apEIxprEzkQ==}

  '@types/range-parser@1.2.7':
    resolution: {integrity: sha512-hKormJbkJqzQGhziax5PItDUTMAM9uE2XXQmM37dyd4hVM+5aVl7oVxMVUiVQn2oCQFN/LKCZdvSM0pFRqbSmQ==}

  '@types/react-dom@19.2.1':
    resolution: {integrity: sha512-/EEvYBdT3BflCWvTMO7YkYBHVE9Ci6XdqZciZANQgKpaiDRGOLIlRo91jbTNRQjgPFWVaRxcYc0luVNFitz57A==}
    peerDependencies:
      '@types/react': ^19.2.0

  '@types/react@19.2.1':
    resolution: {integrity: sha512-1U5NQWh/GylZQ50ZMnnPjkYHEaGhg6t5i/KI0LDDh3t4E3h3T3vzm+GLY2BRzMfIjSBwzm6tginoZl5z0O/qsA==}

  '@types/send@0.17.5':
    resolution: {integrity: sha512-z6F2D3cOStZvuk2SaP6YrwkNO65iTZcwA2ZkSABegdkAh/lf+Aa/YQndZVfmEXT5vgAp6zv06VQ3ejSVjAny4w==}

  '@types/send@1.2.0':
    resolution: {integrity: sha512-zBF6vZJn1IaMpg3xUF25VK3gd3l8zwE0ZLRX7dsQyQi+jp4E8mMDJNGDYnYse+bQhYwWERTxVwHpi3dMOq7RKQ==}

  '@types/serve-static@1.15.9':
    resolution: {integrity: sha512-dOTIuqpWLyl3BBXU3maNQsS4A3zuuoYRNIvYSxxhebPfXg2mzWQEPne/nlJ37yOse6uGgR386uTpdsx4D0QZWA==}

  '@types/trusted-types@2.0.7':
    resolution: {integrity: sha512-ScaPdn1dQczgbl0QFTeTOmVHFULt394XJgOQNoyVhZ6r2vLnMLJfBPd53SB52T/3G36VI1/g2MZaX0cwDuXsfw==}

  '@types/unist@2.0.11':
    resolution: {integrity: sha512-CmBKiL6NNo/OqgmMn95Fk9Whlp2mtvIv+KNpQKN2F4SjvrEesubTRWGYSg+BnWZOnlCaSTU1sMpsBOzgbYhnsA==}

  '@types/unist@3.0.3':
    resolution: {integrity: sha512-ko/gIFJRv177XgZsZcBwnqJN5x/Gien8qNOn0D5bQU/zAzVf9Zt3BlcUiLqhV9y4ARk0GbT3tnUiPNgnTXzc/Q==}

  '@ungap/structured-clone@1.3.0':
    resolution: {integrity: sha512-WmoN8qaIAo7WTYWbAZuG8PYEhn5fkz7dZrqTBZ7dtt//lL2Gwms1IcnQ5yHqjDfX8Ft5j4YzDM23f87zBfDe9g==}
    deprecated: Potential CWE-502 - Update to 1.3.1 or higher

  '@vitejs/plugin-react@5.0.4':
    resolution: {integrity: sha512-La0KD0vGkVkSk6K+piWDKRUyg8Rl5iAIKRMH0vMJI0Eg47bq1eOxmoObAaQG37WMW9MSyk7Cs8EIWwJC1PtzKA==}
    engines: {node: ^20.19.0 || >=22.12.0}
    peerDependencies:
      vite: ^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0

  '@vitest/expect@2.1.9':
    resolution: {integrity: sha512-UJCIkTBenHeKT1TTlKMJWy1laZewsRIzYighyYiJKZreqtdxSos/S1t+ktRMQWu2CKqaarrkeszJx1cgC5tGZw==}

  '@vitest/mocker@2.1.9':
    resolution: {integrity: sha512-tVL6uJgoUdi6icpxmdrn5YNo3g3Dxv+IHJBr0GXHaEdTcw3F+cPKnsXFhli6nO+f/6SDKPHEK1UN+k+TQv0Ehg==}
    peerDependencies:
      msw: ^2.4.9
      vite: ^5.0.0
    peerDependenciesMeta:
      msw:
        optional: true
      vite:
        optional: true

  '@vitest/pretty-format@2.1.9':
    resolution: {integrity: sha512-KhRIdGV2U9HOUzxfiHmY8IFHTdqtOhIzCpd8WRdJiE7D/HUcZVD0EgQCVjm+Q9gkUXWgBvMmTtZgIG48wq7sOQ==}

  '@vitest/runner@2.1.9':
    resolution: {integrity: sha512-ZXSSqTFIrzduD63btIfEyOmNcBmQvgOVsPNPe0jYtESiXkhd8u2erDLnMxmGrDCwHCCHE7hxwRDCT3pt0esT4g==}

  '@vitest/snapshot@2.1.9':
    resolution: {integrity: sha512-oBO82rEjsxLNJincVhLhaxxZdEtV0EFHMK5Kmx5sJ6H9L183dHECjiefOAdnqpIgT5eZwT04PoggUnW88vOBNQ==}

  '@vitest/spy@2.1.9':
    resolution: {integrity: sha512-E1B35FwzXXTs9FHNK6bDszs7mtydNi5MIfUWpceJ8Xbfb1gBMscAnwLbEu+B44ed6W3XjL9/ehLPHR1fkf1KLQ==}

  '@vitest/utils@2.1.9':
    resolution: {integrity: sha512-v0psaMSkNJ3A2NMrUEHFRzJtDPFn+/VWZ5WxImB21T9fjucJRmS7xCS3ppEnARb9y11OAzaD+P2Ps+b+BGX5iQ==}

  accepts@1.3.8:
    resolution: {integrity: sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==}
    engines: {node: '>= 0.6'}

  acorn@8.15.0:
    resolution: {integrity: sha512-NZyJarBfL7nWwIq+FDL6Zp/yHEhePMNnnJ0y3qfieCrmNvYct8uvtiV41UvlSe6apAfk0fY1FbWx+NwfmpvtTg==}
    engines: {node: '>=0.4.0'}
    hasBin: true

  add@2.0.6:
    resolution: {integrity: sha512-j5QzrmsokwWWp6kUcJQySpbG+xfOBqqKnup3OIk1pz+kB/80SLorZ9V8zHFLO92Lcd+hbvq8bT+zOGoPkmBV0Q==}

  aria-hidden@1.2.6:
    resolution: {integrity: sha512-ik3ZgC9dY/lYVVM++OISsaYDeg1tb0VtP5uL3ouh1koGOaUMDPpbFIei4JkFimWUFPn90sbMNMXQAIVOlnYKJA==}
    engines: {node: '>=10'}

  array-flatten@1.1.1:
    resolution: {integrity: sha512-PCVAQswWemu6UdxsDFFX/+gVeYqKAod3D3UVm91jHwynguOwAvYPhx8nNlM++NqRcK6CxxpUafjmhIdKiHibqg==}

  assertion-error@2.0.1:
    resolution: {integrity: sha512-Izi8RQcffqCeNVgFigKli1ssklIbpHnCYc6AknXGYoB6grJqyeby7jv12JUQgmTAnIDnbck1uxksT4dzN3PWBA==}
    engines: {node: '>=12'}

  asynckit@0.4.0:
    resolution: {integrity: sha512-Oei9OH4tRh0YqU3GxhX79dM/mwVgvbZJaSNaRk+bshkj0S5cfHcgYakreBjrHwatXKbz+IoIdYLxrKim2MjW0Q==}

  autoprefixer@10.4.21:
    resolution: {integrity: sha512-O+A6LWV5LDHSJD3LjHYoNi4VLsj/Whi7k6zG12xTYaU4cQ8oxQGckXNX8cRHK5yOZ/ppVHe0ZBXGzSV9jXdVbQ==}
    engines: {node: ^10 || ^12 || >=14}
    hasBin: true
    peerDependencies:
      postcss: ^8.1.0

  aws-ssl-profiles@1.1.2:
    resolution: {integrity: sha512-NZKeq9AfyQvEeNlN0zSYAaWrmBffJh3IELMZfRpJVWgrpEbtEpnjvzqBPf+mxoI287JohRDoa+/nsfqqiZmF6g==}
    engines: {node: '>= 6.0.0'}

  axios@1.12.2:
    resolution: {integrity: sha512-vMJzPewAlRyOgxV2dU0Cuz2O8zzzx9VYtbJOaBgXFeLc4IV/Eg50n4LowmehOOR61S8ZMpc2K5Sa7g6A4jfkUw==}

  bail@2.0.2:
    resolution: {integrity: sha512-0xO6mYd7JB2YesxDKplafRpsiOzPt9V02ddPCLbY1xYGPOX24NTyN50qnUxgCPcSoYMhKpAuBTjQoRZCAkUDRw==}

  baseline-browser-mapping@2.8.13:
    resolution: {integrity: sha512-7s16KR8io8nIBWQyCYhmFhd+ebIzb9VKTzki+wOJXHTxTnV6+mFGH3+Jwn1zoKaY9/H9T/0BcKCZnzXljPnpSQ==}
    hasBin: true

  body-parser@1.20.3:
    resolution: {integrity: sha512-7rAxByjUMqQ3/bHJy7D6OGXvx/MMc4IqBn/X0fcM1QUcAItpZrBEYhWGem+tzXH90c+G01ypMcYJBO9Y30203g==}
    engines: {node: '>= 0.8', npm: 1.2.8000 || >= 1.4.16}

  bowser@2.14.1:
    resolution: {integrity: sha512-tzPjzCxygAKWFOJP011oxFHs57HzIhOEracIgAePE4pqB3LikALKnSzUyU4MGs9/iCEUuHlAJTjTc5M+u7YEGg==}

  browserslist@4.26.3:
    resolution: {integrity: sha512-lAUU+02RFBuCKQPj/P6NgjlbCnLBMp4UtgTx7vNHd3XSIJF87s9a5rA3aH2yw3GS9DqZAUbOtZdCCiZeVRqt0w==}
    engines: {node: ^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7}
    hasBin: true

  buffer-from@1.1.2:
    resolution: {integrity: sha512-E+XQCRwSbaaiChtv6k6Dwgc+bx+Bs6vuKJHHl5kox/BaKbhiXzqQOwK4cO22yElGp2OCmjwVhT3HmxgyPGnJfQ==}

  bytes@3.1.2:
    resolution: {integrity: sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==}
    engines: {node: '>= 0.8'}

  cac@6.7.14:
    resolution: {integrity: sha512-b6Ilus+c3RrdDk+JhLKUAQfzzgLEPy6wcXqS7f/xe1EETvsDP6GORG7SFuOs6cID5YkqchW/LXZbX5bc8j7ZcQ==}
    engines: {node: '>=8'}

  call-bind-apply-helpers@1.0.2:
    resolution: {integrity: sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==}
    engines: {node: '>= 0.4'}

  call-bound@1.0.4:
    resolution: {integrity: sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==}
    engines: {node: '>= 0.4'}

  caniuse-lite@1.0.30001748:
    resolution: {integrity: sha512-5P5UgAr0+aBmNiplks08JLw+AW/XG/SurlgZLgB1dDLfAw7EfRGxIwzPHxdSCGY/BTKDqIVyJL87cCN6s0ZR0w==}

  ccount@2.0.1:
    resolution: {integrity: sha512-eyrF0jiFpY+3drT6383f1qhkbGsLSifNAjA61IUjZjmLCWjItY6LB9ft9YhoDgwfmclB2zhu51Lc7+95b8NRAg==}

  chai@5.3.3:
    resolution: {integrity: sha512-4zNhdJD/iOjSH0A05ea+Ke6MU5mmpQcbQsSOkgdaUMJ9zTlDTD/GYlwohmIE2u0gaxHYiVHEn1Fw9mZ/ktJWgw==}
    engines: {node: '>=18'}

  character-entities-html4@2.1.0:
    resolution: {integrity: sha512-1v7fgQRj6hnSwFpq1Eu0ynr/CDEw0rXo2B61qXrLNdHZmPKgb7fqS1a2JwF0rISo9q77jDI8VMEHoApn8qDoZA==}

  character-entities-legacy@3.0.0:
    resolution: {integrity: sha512-RpPp0asT/6ufRm//AJVwpViZbGM/MkjQFxJccQRHmISF/22NBtsHqAWmL+/pmkPWoIUJdWyeVleTl1wydHATVQ==}

  character-entities@2.0.2:
    resolution: {integrity: sha512-shx7oQ0Awen/BRIdkjkvz54PnEEI/EjwXDSIZp86/KKdbafHh1Df/RYGBhn4hbe2+uKC9FnT5UCEdyPz3ai9hQ==}

  character-reference-invalid@2.0.1:
    resolution: {integrity: sha512-iBZ4F4wRbyORVsu0jPV7gXkOsGYjGHPmAyv+HiHG8gi5PtC9KI2j1+v8/tlibRvjoWX027ypmG/n0HtO5t7unw==}

  check-error@2.1.1:
    resolution: {integrity: sha512-OAlb+T7V4Op9OwdkjmguYRqncdlx5JiofwOAUkmTF+jNdHwzTaTs4sRAGpzLF3oOz5xAyDGrPgeIDFQmDOTiJw==}
    engines: {node: '>= 16'}

  chevrotain-allstar@0.3.1:
    resolution: {integrity: sha512-b7g+y9A0v4mxCW1qUhf3BSVPg+/NvGErk/dOkrDaHA0nQIQGAtrOjlX//9OQtRlSCy+x9rfB5N8yC71lH1nvMw==}
    peerDependencies:
      chevrotain: ^11.0.0

  chevrotain@11.0.3:
    resolution: {integrity: sha512-ci2iJH6LeIkvP9eJW6gpueU8cnZhv85ELY8w8WiFtNjMHA5ad6pQLaJo9mEly/9qUyCpvqX8/POVUTf18/HFdw==}

  chownr@3.0.0:
    resolution: {integrity: sha512-+IxzY9BZOQd/XuYPRmrvEVjF/nqj5kgT4kEq7VofrDoM1MxoRjEWkrCC3EtLi59TVawxTAn+orJwFQcrqEN1+g==}
    engines: {node: '>=18'}

  class-variance-authority@0.7.1:
    resolution: {integrity: sha512-Ka+9Trutv7G8M6WT6SeiRWz792K5qEqIGEGzXKhAE6xOWAY6pPH8U+9IY3oCMv6kqTmLsv7Xh/2w2RigkePMsg==}

  clsx@2.1.1:
    resolution: {integrity: sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA==}
    engines: {node: '>=6'}

  cmdk@1.1.1:
    resolution: {integrity: sha512-Vsv7kFaXm+ptHDMZ7izaRsP70GgrW9NBNGswt9OZaVBLlE0SNpDq8eu/VGXyF9r7M0azK3Wy7OlYXsuyYLFzHg==}
    peerDependencies:
      react: ^18 || ^19 || ^19.0.0-rc
      react-dom: ^18 || ^19 || ^19.0.0-rc

  combined-stream@1.0.8:
    resolution: {integrity: sha512-FQN4MRfuJeHf7cBbBMJFXhKSDq+2kAArBlmRBvcvFE5BB1HZKXtSFASDhdlz9zOYwxh8lDdnvmMOe/+5cdoEdg==}
    engines: {node: '>= 0.8'}

  comma-separated-tokens@2.0.3:
    resolution: {integrity: sha512-Fu4hJdvzeylCfQPp9SGWidpzrMs7tTrlu6Vb8XGaRGck8QSNZJJp538Wrb60Lax4fPwR64ViY468OIUTbRlGZg==}

  commander@7.2.0:
    resolution: {integrity: sha512-QrWXB+ZQSVPmIWIhtEO9H+gwHaMGYiF5ChvoJ+K9ZGHG/sVsa6yiesAD1GC/x46sET00Xlwo1u49RVVVzvcSkw==}
    engines: {node: '>= 10'}

  commander@8.3.0:
    resolution: {integrity: sha512-OkTL9umf+He2DZkUq8f8J9of7yL6RJKI24dVITBmNfZBmri9zYZQrKkuXiKhyfPSu8tUhnVBB1iKXevvnlR4Ww==}
    engines: {node: '>= 12'}

  confbox@0.1.8:
    resolution: {integrity: sha512-RMtmw0iFkeR4YV+fUOSucriAQNb9g8zFR52MWCtl+cCZOFRNL6zeB395vPzFhEjjn4fMxXudmELnl/KF/WrK6w==}

  confbox@0.2.2:
    resolution: {integrity: sha512-1NB+BKqhtNipMsov4xI/NnhCKp9XG9NamYp5PVm9klAT0fsrNPjaFICsCFhNhwZJKNh7zB/3q8qXz0E9oaMNtQ==}

  content-disposition@0.5.4:
    resolution: {integrity: sha512-FveZTNuGw04cxlAiWbzi6zTAL/lhehaWbTtgluJh4/E95DqMwTmha3KZN1aAWA8cFIhHzMZUvLevkw5Rqk+tSQ==}
    engines: {node: '>= 0.6'}

  content-type@1.0.5:
    resolution: {integrity: sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==}
    engines: {node: '>= 0.6'}

  convert-source-map@2.0.0:
    resolution: {integrity: sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==}

  cookie-signature@1.0.6:
    resolution: {integrity: sha512-QADzlaHc8icV8I7vbaJXJwod9HWYp8uCqf1xa4OfNu1T7JVxQIrUgOWtHdNDtPiywmFbiS12VjotIXLrKM3orQ==}

  cookie@0.7.1:
    resolution: {integrity: sha512-6DnInpx7SJ2AK3+CTUE/ZM0vWTUboZCegxhC2xiIydHR9jNuTAASBrfEpHhiGOZw/nX51bHt6YQl8jsGo4y/0w==}
    engines: {node: '>= 0.6'}

  cookie@1.1.1:
    resolution: {integrity: sha512-ei8Aos7ja0weRpFzJnEA9UHJ/7XQmqglbRwnf2ATjcB9Wq874VKH9kfjjirM6UhU2/E5fFYadylyhFldcqSidQ==}
    engines: {node: '>=18'}

  copy-anything@3.0.5:
    resolution: {integrity: sha512-yCEafptTtb4bk7GLEQoM8KVJpxAfdBJYaXyzQEgQQQgYrZiDp8SJmGKlYza6CYjEDNstAdNdKA3UuoULlEbS6w==}
    engines: {node: '>=12.13'}

  core-util-is@1.0.3:
    resolution: {integrity: sha512-ZQBvi1DcpJ4GDqanjucZ2Hj3wEO5pZDS89BWbkcrvdxksJorwUDDZamX9ldFkp9aw2lmBDLgkObEA4DWNJ9FYQ==}

  cose-base@1.0.3:
    resolution: {integrity: sha512-s9whTXInMSgAp/NVXVNuVxVKzGH2qck3aQlVHxDCdAEPgtMKwc4Wq6/QKhgdEdgbLSi9rBTAcPoRa6JpiG4ksg==}

  cose-base@2.2.0:
    resolution: {integrity: sha512-AzlgcsCbUMymkADOJtQm3wO9S3ltPfYOFD5033keQn9NJzIbtnZj+UdBJe7DYml/8TdbtHJW3j58SOnKhWY/5g==}

  cssesc@3.0.0:
    resolution: {integrity: sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg==}
    engines: {node: '>=4'}
    hasBin: true

  csstype@3.1.3:
    resolution: {integrity: sha512-M1uQkMl8rQK/szD0LNhtqxIPLpimGm8sOBwU7lLnCpSbTyY3yeU1Vc7l4KT5zT4s/yOxHH5O7tIuuLOCnLADRw==}

  cytoscape-cose-bilkent@4.1.0:
    resolution: {integrity: sha512-wgQlVIUJF13Quxiv5e1gstZ08rnZj2XaLHGoFMYXz7SkNfCDOOteKBE6SYRfA9WxxI/iBc3ajfDoc6hb/MRAHQ==}
    peerDependencies:
      cytoscape: ^3.2.0

  cytoscape-fcose@2.2.0:
    resolution: {integrity: sha512-ki1/VuRIHFCzxWNrsshHYPs6L7TvLu3DL+TyIGEsRcvVERmxokbf5Gdk7mFxZnTdiGtnA4cfSmjZJMviqSuZrQ==}
    peerDependencies:
      cytoscape: ^3.2.0

  cytoscape@3.33.1:
    resolution: {integrity: sha512-iJc4TwyANnOGR1OmWhsS9ayRS3s+XQ185FmuHObThD+5AeJCakAAbWv8KimMTt08xCCLNgneQwFp+JRJOr9qGQ==}
    engines: {node: '>=0.10'}

  d3-array@2.12.1:
    resolution: {integrity: sha512-B0ErZK/66mHtEsR1TkPEEkwdy+WDesimkM5gpZr5Dsg54BiTA5RXtYW5qTLIAcekaS9xfZrzBLF/OAkB3Qn1YQ==}

  d3-array@3.2.4:
    resolution: {integrity: sha512-tdQAmyA18i4J7wprpYq8ClcxZy3SC31QMeByyCFyRt7BVHdREQZ5lpzoe5mFEYZUWe+oq8HBvk9JjpibyEV4Jg==}
    engines: {node: '>=12'}

  d3-axis@3.0.0:
    resolution: {integrity: sha512-IH5tgjV4jE/GhHkRV0HiVYPDtvfjHQlQfJHs0usq7M30XcSBvOotpmH1IgkcXsO/5gEQZD43B//fc7SRT5S+xw==}
    engines: {node: '>=12'}

  d3-brush@3.0.0:
    resolution: {integrity: sha512-ALnjWlVYkXsVIGlOsuWH1+3udkYFI48Ljihfnh8FZPF2QS9o+PzGLBslO0PjzVoHLZ2KCVgAM8NVkXPJB2aNnQ==}
    engines: {node: '>=12'}

  d3-chord@3.0.1:
    resolution: {integrity: sha512-VE5S6TNa+j8msksl7HwjxMHDM2yNK3XCkusIlpX5kwauBfXuyLAtNg9jCp/iHH61tgI4sb6R/EIMWCqEIdjT/g==}
    engines: {node: '>=12'}

  d3-color@3.1.0:
    resolution: {integrity: sha512-zg/chbXyeBtMQ1LbD/WSoW2DpC3I0mpmPdW+ynRTj/x2DAWYrIY7qeZIHidozwV24m4iavr15lNwIwLxRmOxhA==}
    engines: {node: '>=12'}

  d3-contour@4.0.2:
    resolution: {integrity: sha512-4EzFTRIikzs47RGmdxbeUvLWtGedDUNkTcmzoeyg4sP/dvCexO47AaQL7VKy/gul85TOxw+IBgA8US2xwbToNA==}
    engines: {node: '>=12'}

  d3-delaunay@6.0.4:
    resolution: {integrity: sha512-mdjtIZ1XLAM8bm/hx3WwjfHt6Sggek7qH043O8KEjDXN40xi3vx/6pYSVTwLjEgiXQTbvaouWKynLBiUZ6SK6A==}
    engines: {node: '>=12'}

  d3-dispatch@3.0.1:
    resolution: {integrity: sha512-rzUyPU/S7rwUflMyLc1ETDeBj0NRuHKKAcvukozwhshr6g6c5d8zh4c2gQjY2bZ0dXeGLWc1PF174P2tVvKhfg==}
    engines: {node: '>=12'}

  d3-drag@3.0.0:
    resolution: {integrity: sha512-pWbUJLdETVA8lQNJecMxoXfH6x+mO2UQo8rSmZ+QqxcbyA3hfeprFgIT//HW2nlHChWeIIMwS2Fq+gEARkhTkg==}
    engines: {node: '>=12'}

  d3-dsv@3.0.1:
    resolution: {integrity: sha512-UG6OvdI5afDIFP9w4G0mNq50dSOsXHJaRE8arAS5o9ApWnIElp8GZw1Dun8vP8OyHOZ/QJUKUJwxiiCCnUwm+Q==}
    engines: {node: '>=12'}
    hasBin: true

  d3-ease@3.0.1:
    resolution: {integrity: sha512-wR/XK3D3XcLIZwpbvQwQ5fK+8Ykds1ip7A2Txe0yxncXSdq1L9skcG7blcedkOX+ZcgxGAmLX1FrRGbADwzi0w==}
    engines: {node: '>=12'}

  d3-fetch@3.0.1:
    resolution: {integrity: sha512-kpkQIM20n3oLVBKGg6oHrUchHM3xODkTzjMoj7aWQFq5QEM+R6E4WkzT5+tojDY7yjez8KgCBRoj4aEr99Fdqw==}
    engines: {node: '>=12'}

  d3-force@3.0.0:
    resolution: {integrity: sha512-zxV/SsA+U4yte8051P4ECydjD/S+qeYtnaIyAs9tgHCqfguma/aAQDjo85A9Z6EKhBirHRJHXIgJUlffT4wdLg==}
    engines: {node: '>=12'}

  d3-format@3.1.0:
    resolution: {integrity: sha512-YyUI6AEuY/Wpt8KWLgZHsIU86atmikuoOmCfommt0LYHiQSPjvX2AcFc38PX0CBpr2RCyZhjex+NS/LPOv6YqA==}
    engines: {node: '>=12'}

  d3-geo@3.1.1:
    resolution: {integrity: sha512-637ln3gXKXOwhalDzinUgY83KzNWZRKbYubaG+fGVuc/dxO64RRljtCTnf5ecMyE1RIdtqpkVcq0IbtU2S8j2Q==}
    engines: {node: '>=12'}

  d3-hierarchy@3.1.2:
    resolution: {integrity: sha512-FX/9frcub54beBdugHjDCdikxThEqjnR93Qt7PvQTOHxyiNCAlvMrHhclk3cD5VeAaq9fxmfRp+CnWw9rEMBuA==}
    engines: {node: '>=12'}

  d3-interpolate@3.0.1:
    resolution: {integrity: sha512-3bYs1rOD33uo8aqJfKP3JWPAibgw8Zm2+L9vBKEHJ2Rg+viTR7o5Mmv5mZcieN+FRYaAOWX5SJATX6k1PWz72g==}
    engines: {node: '>=12'}

  d3-path@1.0.9:
    resolution: {integrity: sha512-VLaYcn81dtHVTjEHd8B+pbe9yHWpXKZUC87PzoFmsFrJqgFwDe/qxfp5MlfsfM1V5E/iVt0MmEbWQ7FVIXh/bg==}

  d3-path@3.1.0:
    resolution: {integrity: sha512-p3KP5HCf/bvjBSSKuXid6Zqijx7wIfNW+J/maPs+iwR35at5JCbLUT0LzF1cnjbCHWhqzQTIN2Jpe8pRebIEFQ==}
    engines: {node: '>=12'}

  d3-polygon@3.0.1:
    resolution: {integrity: sha512-3vbA7vXYwfe1SYhED++fPUQlWSYTTGmFmQiany/gdbiWgU/iEyQzyymwL9SkJjFFuCS4902BSzewVGsHHmHtXg==}
    engines: {node: '>=12'}

  d3-quadtree@3.0.1:
    resolution: {integrity: sha512-04xDrxQTDTCFwP5H6hRhsRcb9xxv2RzkcsygFzmkSIOJy3PeRJP7sNk3VRIbKXcog561P9oU0/rVH6vDROAgUw==}
    engines: {node: '>=12'}

  d3-random@3.0.1:
    resolution: {integrity: sha512-FXMe9GfxTxqd5D6jFsQ+DJ8BJS4E/fT5mqqdjovykEB2oFbTMDVdg1MGFxfQW+FBOGoB++k8swBrgwSHT1cUXQ==}
    engines: {node: '>=12'}

  d3-sankey@0.12.3:
    resolution: {integrity: sha512-nQhsBRmM19Ax5xEIPLMY9ZmJ/cDvd1BG3UVvt5h3WRxKg5zGRbvnteTyWAbzeSvlh3tW7ZEmq4VwR5mB3tutmQ==}

  d3-scale-chromatic@3.1.0:
    resolution: {integrity: sha512-A3s5PWiZ9YCXFye1o246KoscMWqf8BsD9eRiJ3He7C9OBaxKhAd5TFCdEx/7VbKtxxTsu//1mMJFrEt572cEyQ==}
    engines: {node: '>=12'}

  d3-scale@4.0.2:
    resolution: {integrity: sha512-GZW464g1SH7ag3Y7hXjf8RoUuAFIqklOAq3MRl4OaWabTFJY9PN/E1YklhXLh+OQ3fM9yS2nOkCoS+WLZ6kvxQ==}
    engines: {node: '>=12'}

  d3-selection@3.0.0:
    resolution: {integrity: sha512-fmTRWbNMmsmWq6xJV8D19U/gw/bwrHfNXxrIN+HfZgnzqTHp9jOmKMhsTUjXOJnZOdZY9Q28y4yebKzqDKlxlQ==}
    engines: {node: '>=12'}

  d3-shape@1.3.7:
    resolution: {integrity: sha512-EUkvKjqPFUAZyOlhY5gzCxCeI0Aep04LwIRpsZ/mLFelJiUfnK56jo5JMDSE7yyP2kLSb6LtF+S5chMk7uqPqw==}

  d3-shape@3.2.0:
    resolution: {integrity: sha512-SaLBuwGm3MOViRq2ABk3eLoxwZELpH6zhl3FbAoJ7Vm1gofKx6El1Ib5z23NUEhF9AsGl7y+dzLe5Cw2AArGTA==}
    engines: {node: '>=12'}

  d3-time-format@4.1.0:
    resolution: {integrity: sha512-dJxPBlzC7NugB2PDLwo9Q8JiTR3M3e4/XANkreKSUxF8vvXKqm1Yfq4Q5dl8budlunRVlUUaDUgFt7eA8D6NLg==}
    engines: {node: '>=12'}

  d3-time@3.1.0:
    resolution: {integrity: sha512-VqKjzBLejbSMT4IgbmVgDjpkYrNWUYJnbCGo874u7MMKIWsILRX+OpX/gTk8MqjpT1A/c6HY2dCA77ZN0lkQ2Q==}
    engines: {node: '>=12'}

  d3-timer@3.0.1:
    resolution: {integrity: sha512-ndfJ/JxxMd3nw31uyKoY2naivF+r29V+Lc0svZxe1JvvIRmi8hUsrMvdOwgS1o6uBHmiz91geQ0ylPP0aj1VUA==}
    engines: {node: '>=12'}

  d3-transition@3.0.1:
    resolution: {integrity: sha512-ApKvfjsSR6tg06xrL434C0WydLr7JewBB3V+/39RMHsaXTOG0zmt/OAXeng5M5LBm0ojmxJrpomQVZ1aPvBL4w==}
    engines: {node: '>=12'}
    peerDependencies:
      d3-selection: 2 - 3

  d3-zoom@3.0.0:
    resolution: {integrity: sha512-b8AmV3kfQaqWAuacbPuNbL6vahnOJflOhexLzMMNLga62+/nh0JzvJ0aO/5a5MVgUFGS7Hu1P9P03o3fJkDCyw==}
    engines: {node: '>=12'}

  d3@7.9.0:
    resolution: {integrity: sha512-e1U46jVP+w7Iut8Jt8ri1YsPOvFpg46k+K8TpCb0P+zjCkjkPnV7WzfDJzMHy1LnA+wj5pLT1wjO901gLXeEhA==}
    engines: {node: '>=12'}

  dagre-d3-es@7.0.11:
    resolution: {integrity: sha512-tvlJLyQf834SylNKax8Wkzco/1ias1OPw8DcUMDE7oUIoSEW25riQVuiu/0OWEFqT0cxHT3Pa9/D82Jr47IONw==}

  date-fns-jalali@4.1.0-0:
    resolution: {integrity: sha512-hTIP/z+t+qKwBDcmmsnmjWTduxCg+5KfdqWQvb2X/8C9+knYY6epN/pfxdDuyVlSVeFz0sM5eEfwIUQ70U4ckg==}

  date-fns@4.1.0:
    resolution: {integrity: sha512-Ukq0owbQXxa/U3EGtsdVBkR1w7KOQ5gIBqdH2hkvknzZPYvBxb/aa6E8L7tmjFtkwZBu3UXBbjIgPo/Ez4xaNg==}

  dayjs@1.11.18:
    resolution: {integrity: sha512-zFBQ7WFRvVRhKcWoUh+ZA1g2HVgUbsZm9sbddh8EC5iv93sui8DVVz1Npvz+r6meo9VKfa8NyLWBsQK1VvIKPA==}

  debug@2.6.9:
    resolution: {integrity: sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  debug@4.4.3:
    resolution: {integrity: sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  decimal.js-light@2.5.1:
    resolution: {integrity: sha512-qIMFpTMZmny+MMIitAB6D7iVPEorVw6YQRWkvarTkT4tBeSLLiHzcwj6q0MmYSFCiVpiqPJTJEYIrpcPzVEIvg==}

  decode-named-character-reference@1.2.0:
    resolution: {integrity: sha512-c6fcElNV6ShtZXmsgNgFFV5tVX2PaV4g+MOAkb8eXHvn6sryJBrZa9r0zV6+dtTyoCKxtDy5tyQ5ZwQuidtd+Q==}

  deep-eql@5.0.2:
    resolution: {integrity: sha512-h5k/5U50IJJFpzfL6nO9jaaumfjO/f2NjK/oYB2Djzm4p9L+3T9qWpZqZ2hAbLPuuYq9wrU08WQyBTL5GbPk5Q==}
    engines: {node: '>=6'}

  delaunator@5.0.1:
    resolution: {integrity: sha512-8nvh+XBe96aCESrGOqMp/84b13H9cdKbG5P2ejQCh4d4sK9RL4371qou9drQjMhvnPmhWl5hnmqbEE0fXr9Xnw==}

  delayed-stream@1.0.0:
    resolution: {integrity: sha512-ZySD7Nf91aLB0RxL4KGrKHBXl7Eds1DAmEdcoVawXnLD7SDhpNgtuII2aAkg7a7QS41jxPSZ17p4VdGnMHk3MQ==}
    engines: {node: '>=0.4.0'}

  depd@2.0.0:
    resolution: {integrity: sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==}
    engines: {node: '>= 0.8'}

  dequal@2.0.3:
    resolution: {integrity: sha512-0je+qPKHEMohvfRTCEo3CrPG6cAzAYgmzKyxRiYSSDkS6eGJdyVJm7WaYA5ECaAD9wLB2T4EEeymA5aFVcYXCA==}
    engines: {node: '>=6'}

  destroy@1.2.0:
    resolution: {integrity: sha512-2sJGJTaXIIaR1w4iJSNoN0hnMY7Gpc/n8D4qSCJw8QqFWXf7cuAgnEHxBpweaVcPevC2l3KpjYCx3NypQQgaJg==}
    engines: {node: '>= 0.8', npm: 1.2.8000 || >= 1.4.16}

  detect-libc@2.1.2:
    resolution: {integrity: sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==}
    engines: {node: '>=8'}

  detect-node-es@1.1.0:
    resolution: {integrity: sha512-ypdmJU/TbBby2Dxibuv7ZLW3Bs1QEmM7nHjEANfohJLvE0XVujisn1qPJcZxg+qDucsr+bP6fLD1rPS3AhJ7EQ==}

  devlop@1.1.0:
    resolution: {integrity: sha512-RWmIqhcFf1lRYBvNmr7qTNuyCt/7/ns2jbpp1+PalgE/rDQcBT0fioSMUpJ93irlUhC5hrg4cYqe6U+0ImW0rA==}

  dom-helpers@5.2.1:
    resolution: {integrity: sha512-nRCa7CK3VTrM2NmGkIy4cbK7IZlgBE/PYMn55rrXefr5xXDP0LdtfPnblFDoVdcAfslJ7or6iqAUnx0CCGIWQA==}

  dompurify@3.3.0:
    resolution: {integrity: sha512-r+f6MYR1gGN1eJv0TVQbhA7if/U7P87cdPl3HN5rikqaBSBxLiCb/b9O+2eG0cxz0ghyU+mU1QkbsOwERMYlWQ==}

  dotenv@17.4.2:
    resolution: {integrity: sha512-nI4U3TottKAcAD9LLud4Cb7b2QztQMUEfHbvhTH09bqXTxnSie8WnjPALV/WMCrJZ6UV/qHJ6L03OqO3LcdYZw==}
    engines: {node: '>=12'}

  drizzle-kit@0.31.10:
    resolution: {integrity: sha512-7OZcmQUrdGI+DUNNsKBn1aW8qSoKuTH7d0mYgSP8bAzdFzKoovxEFnoGQp2dVs82EOJeYycqRtciopszwUf8bw==}
    hasBin: true

  drizzle-orm@0.44.7:
    resolution: {integrity: sha512-quIpnYznjU9lHshEOAYLoZ9s3jweleHlZIAWR/jX9gAWNg/JhQ1wj0KGRf7/Zm+obRrYd9GjPVJg790QY9N5AQ==}
    peerDependencies:
      '@aws-sdk/client-rds-data': '>=3'
      '@cloudflare/workers-types': '>=4'
      '@electric-sql/pglite': '>=0.2.0'
      '@libsql/client': '>=0.10.0'
      '@libsql/client-wasm': '>=0.10.0'
      '@neondatabase/serverless': '>=0.10.0'
      '@op-engineering/op-sqlite': '>=2'
      '@opentelemetry/api': ^1.4.1
      '@planetscale/database': '>=1.13'
      '@prisma/client': '*'
      '@tidbcloud/serverless': '*'
      '@types/better-sqlite3': '*'
      '@types/pg': '*'
      '@types/sql.js': '*'
      '@upstash/redis': '>=1.34.7'
      '@vercel/postgres': '>=0.8.0'
      '@xata.io/client': '*'
      better-sqlite3: '>=7'
      bun-types: '*'
      expo-sqlite: '>=14.0.0'
      gel: '>=2'
      knex: '*'
      kysely: '*'
      mysql2: '>=2'
      pg: '>=8'
      postgres: '>=3'
      prisma: '*'
      sql.js: '>=1'
      sqlite3: '>=5'
    peerDependenciesMeta:
      '@aws-sdk/client-rds-data':
        optional: true
      '@cloudflare/workers-types':
        optional: true
      '@electric-sql/pglite':
        optional: true
      '@libsql/client':
        optional: true
      '@libsql/client-wasm':
        optional: true
      '@neondatabase/serverless':
        optional: true
      '@op-engineering/op-sqlite':
        optional: true
      '@opentelemetry/api':
        optional: true
      '@planetscale/database':
        optional: true
      '@prisma/client':
        optional: true
      '@tidbcloud/serverless':
        optional: true
      '@types/better-sqlite3':
        optional: true
      '@types/pg':
        optional: true
      '@types/sql.js':
        optional: true
      '@upstash/redis':
        optional: true
      '@vercel/postgres':
        optional: true
      '@xata.io/client':
        optional: true
      better-sqlite3:
        optional: true
      bun-types:
        optional: true
      expo-sqlite:
        optional: true
      gel:
        optional: true
      knex:
        optional: true
      kysely:
        optional: true
      mysql2:
        optional: true
      pg:
        optional: true
      postgres:
        optional: true
      prisma:
        optional: true
      sql.js:
        optional: true
      sqlite3:
        optional: true

  dunder-proto@1.0.1:
    resolution: {integrity: sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==}
    engines: {node: '>= 0.4'}

  ee-first@1.1.1:
    resolution: {integrity: sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==}

  electron-to-chromium@1.5.232:
    resolution: {integrity: sha512-ENirSe7wf8WzyPCibqKUG1Cg43cPaxH4wRR7AJsX7MCABCHBIOFqvaYODSLKUuZdraxUTHRE/0A2Aq8BYKEHOg==}

  embla-carousel-react@8.6.0:
    resolution: {integrity: sha512-0/PjqU7geVmo6F734pmPqpyHqiM99olvyecY7zdweCw+6tKEXnrE90pBiBbMMU8s5tICemzpQ3hi5EpxzGW+JA==}
    peerDependencies:
      react: ^16.8.0 || ^17.0.1 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc

  embla-carousel-reactive-utils@8.6.0:
    resolution: {integrity: sha512-fMVUDUEx0/uIEDM0Mz3dHznDhfX+znCCDCeIophYb1QGVM7YThSWX+wz11zlYwWFOr74b4QLGg0hrGPJeG2s4A==}
    peerDependencies:
      embla-carousel: 8.6.0

  embla-carousel@8.6.0:
    resolution: {integrity: sha512-SjWyZBHJPbqxHOzckOfo8lHisEaJWmwd23XppYFYVh10bU66/Pn5tkVkbkCMZVdbUE5eTCI2nD8OyIP4Z+uwkA==}

  encodeurl@1.0.2:
    resolution: {integrity: sha512-TPJXq8JqFaVYm2CWmPvnP2Iyo4ZSM7/QKcSmuMLDObfpH5fi7RUGmd/rTDf+rut/saiDiQEeVTNgAmJEdAOx0w==}
    engines: {node: '>= 0.8'}

  encodeurl@2.0.0:
    resolution: {integrity: sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==}
    engines: {node: '>= 0.8'}

  enhanced-resolve@5.18.3:
    resolution: {integrity: sha512-d4lC8xfavMeBjzGr2vECC3fsGXziXZQyJxD868h2M/mBI3PwAuODxAkLkq5HYuvrPYcUtiLzsTo8U3PgX3Ocww==}
    engines: {node: '>=10.13.0'}

  entities@6.0.1:
    resolution: {integrity: sha512-aN97NXWF6AWBTahfVOIrB/NShkzi5H7F9r1s9mD3cDj4Ko5f2qhhVoYMibXF7GlLveb/D2ioWay8lxI97Ven3g==}
    engines: {node: '>=0.12'}

  es-define-property@1.0.1:
    resolution: {integrity: sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==}
    engines: {node: '>= 0.4'}

  es-errors@1.3.0:
    resolution: {integrity: sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==}
    engines: {node: '>= 0.4'}

  es-module-lexer@1.7.0:
    resolution: {integrity: sha512-jEQoCwk8hyb2AZziIOLhDqpm5+2ww5uIE6lkO/6jcOCusfk6LhMHpXXfBLXTZ7Ydyt0j4VoUQv6uGNYbdW+kBA==}

  es-object-atoms@1.1.1:
    resolution: {integrity: sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==}
    engines: {node: '>= 0.4'}

  es-set-tostringtag@2.1.0:
    resolution: {integrity: sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA==}
    engines: {node: '>= 0.4'}

  esbuild@0.18.20:
    resolution: {integrity: sha512-ceqxoedUrcayh7Y7ZX6NdbbDzGROiyVBgC4PriJThBKSVPWnnFHZAkfI1lJT8QFkOwH4qOS2SJkS4wvpGl8BpA==}
    engines: {node: '>=12'}
    hasBin: true

  esbuild@0.21.5:
    resolution: {integrity: sha512-mg3OPMV4hXywwpoDxu3Qda5xCKQi+vCTZq8S9J/EpkhB2HzKXq4SNFZE3+NK93JYxc8VMSep+lOUSC/RVKaBqw==}
    engines: {node: '>=12'}
    hasBin: true

  esbuild@0.25.10:
    resolution: {integrity: sha512-9RiGKvCwaqxO2owP61uQ4BgNborAQskMR6QusfWzQqv7AZOg5oGehdY2pRJMTKuwxd1IDBP4rSbI5lHzU7SMsQ==}
    engines: {node: '>=18'}
    hasBin: true

  esbuild@0.28.2:
    resolution: {integrity: sha512-HKVLS8dvII+xoKW9kmqxbRKrnWEXfJJr/FZhhJmiqIB0e053QNYFqOBouTMO/k5sID4MvCiUCvv8b9M4h32wIA==}
    engines: {node: '>=18'}
    hasBin: true

  escalade@3.2.0:
    resolution: {integrity: sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==}
    engines: {node: '>=6'}

  escape-html@1.0.3:
    resolution: {integrity: sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==}

  escape-string-regexp@5.0.0:
    resolution: {integrity: sha512-/veY75JbMK4j1yjvuUxuVsiS/hr/4iHs9FTT6cgTexxdE0Ly/glccBAkloH/DofkjRbZU3bnoj38mOmhkZ0lHw==}
    engines: {node: '>=12'}

  estree-util-is-identifier-name@3.0.0:
    resolution: {integrity: sha512-hFtqIDZTIUZ9BXLb8y4pYGyk6+wekIivNVTcmvk8NoOh+VeRn5y6cEHzbURrWbfp1fIqdVipilzj+lfaadNZmg==}

  estree-walker@2.0.2:
    resolution: {integrity: sha512-Rfkk/Mp/DL7JVje3u18FxFujQlTNR2q6QfMSMB7AvCBx91NGj/ba3kCfza0f6dVDbw7YlRf/nDrn7pQrCCyQ/w==}

  estree-walker@3.0.3:
    resolution: {integrity: sha512-7RUKfXgSMMkzt6ZuXmqapOurLGPPfgj6l9uRZ7lRGolvk0y2yocc35LdcxKC5PQZdn2DMqioAQ2NoWcrTKmm6g==}

  etag@1.8.1:
    resolution: {integrity: sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==}
    engines: {node: '>= 0.6'}

  eventemitter3@4.0.7:
    resolution: {integrity: sha512-8guHBZCwKnFhYdHr2ysuRWErTwhoN2X8XELRlrRwpmfeY2jjuUN4taQMsULKUVo1K4DvZl+0pgfyoysHxvmvEw==}

  expect-type@1.2.2:
    resolution: {integrity: sha512-JhFGDVJ7tmDJItKhYgJCGLOWjuK9vPxiXoUFLwLDc99NlmklilbiQJwoctZtt13+xMw91MCk/REan6MWHqDjyA==}
    engines: {node: '>=12.0.0'}

  express@4.21.2:
    resolution: {integrity: sha512-28HqgMZAmih1Czt9ny7qr6ek2qddF4FclbMzwhCREB6OFfH+rXAnuNCwo1/wFvrtbgsQDb4kSbX9de9lFbrXnA==}
    engines: {node: '>= 0.10.0'}

  exsolve@1.0.7:
    resolution: {integrity: sha512-VO5fQUzZtI6C+vx4w/4BWJpg3s/5l+6pRQEHzFRM8WFi4XffSP1Z+4qi7GbjWbvRQEbdIco5mIMq+zX4rPuLrw==}

  extend@3.0.2:
    resolution: {integrity: sha512-fjquC59cD7CyW6urNXK0FBufkZcoiGG80wTuPujX590cB5Ttln20E2UB4S/WARVqhXffZl2LNgS+gQdPIIim/g==}

  fast-equals@5.3.2:
    resolution: {integrity: sha512-6rxyATwPCkaFIL3JLqw8qXqMpIZ942pTX/tbQFkRsDGblS8tNGtlUauA/+mt6RUfqn/4MoEr+WDkYoIQbibWuQ==}
    engines: {node: '>=6.0.0'}

  fdir@6.5.0:
    resolution: {integrity: sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==}
    engines: {node: '>=12.0.0'}
    peerDependencies:
      picomatch: ^3 || ^4
    peerDependenciesMeta:
      picomatch:
        optional: true

  finalhandler@1.3.1:
    resolution: {integrity: sha512-6BN9trH7bp3qvnrRyzsBz+g3lZxTNZTbVO2EV1CS0WIcDbawYVdYvGflME/9QP0h0pYlCDBCTjYa9nZzMDpyxQ==}
    engines: {node: '>= 0.8'}

  follow-redirects@1.15.11:
    resolution: {integrity: sha512-deG2P0JfjrTxl50XGCDyfI97ZGVCxIpfKYmfyrQ54n5FO/0gfIES8C/Psl6kWVDolizcaaxZJnTS0QSMxvnsBQ==}
    engines: {node: '>=4.0'}
    peerDependencies:
      debug: '*'
    peerDependenciesMeta:
      debug:
        optional: true

  form-data@4.0.4:
    resolution: {integrity: sha512-KrGhL9Q4zjj0kiUt5OO4Mr/A/jlI2jDYs5eHBpYHPcBEVSiipAvn2Ko2HnPe20rmcuuvMHNdZFp+4IlGTMF0Ow==}
    engines: {node: '>= 6'}

  forwarded@0.2.0:
    resolution: {integrity: sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==}
    engines: {node: '>= 0.6'}

  fraction.js@4.3.7:
    resolution: {integrity: sha512-ZsDfxO51wGAXREY55a7la9LScWpwv9RxIrYABrlvOFBlH/ShPnrtsXeuUIfXKKOVicNxQ+o8JTbJvjS4M89yew==}

  framer-motion@12.23.22:
    resolution: {integrity: sha512-ZgGvdxXCw55ZYvhoZChTlG6pUuehecgvEAJz0BHoC5pQKW1EC5xf1Mul1ej5+ai+pVY0pylyFfdl45qnM1/GsA==}
    peerDependencies:
      '@emotion/is-prop-valid': '*'
      react: ^18.0.0 || ^19.0.0
      react-dom: ^18.0.0 || ^19.0.0
    peerDependenciesMeta:
      '@emotion/is-prop-valid':
        optional: true
      react:
        optional: true
      react-dom:
        optional: true

  fresh@0.5.2:
    resolution: {integrity: sha512-zJ2mQYM18rEFOudeV4GShTGIQ7RbzA7ozbU9I/XBpm7kqgMywgmylMwXHxZJmkVoYkna9d2pVXVXPdYTP9ej8Q==}
    engines: {node: '>= 0.6'}

  fsevents@2.3.3:
    resolution: {integrity: sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==}
    engines: {node: ^8.16.0 || ^10.6.0 || >=11.0.0}
    os: [darwin]

  function-bind@1.1.2:
    resolution: {integrity: sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==}

  generate-function@2.3.1:
    resolution: {integrity: sha512-eeB5GfMNeevm/GRYq20ShmsaGcmI81kIX2K9XQx5miC8KdHaC6Jm0qQ8ZNeGOi7wYB8OsdxKs+Y2oVuTFuVwKQ==}

  gensync@1.0.0-beta.2:
    resolution: {integrity: sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==}
    engines: {node: '>=6.9.0'}

  get-intrinsic@1.3.0:
    resolution: {integrity: sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==}
    engines: {node: '>= 0.4'}

  get-nonce@1.0.1:
    resolution: {integrity: sha512-FJhYRoDaiatfEkUK8HKlicmu/3SGFD51q3itKDGoSTysQJBnfOcxU5GxnhE1E6soB76MbT0MBtnKJuXyAx+96Q==}
    engines: {node: '>=6'}

  get-proto@1.0.1:
    resolution: {integrity: sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==}
    engines: {node: '>= 0.4'}

  get-tsconfig@4.12.0:
    resolution: {integrity: sha512-LScr2aNr2FbjAjZh2C6X6BxRx1/x+aTDExct/xyq2XKbYOiG5c0aK7pMsSuyc0brz3ibr/lbQiHD9jzt4lccJw==}

  globals@15.15.0:
    resolution: {integrity: sha512-7ACyT3wmyp3I61S4fG682L0VA2RGD9otkqGJIwNUMF1SWUombIIk+af1unuDYgMm082aHYwD+mzJvv9Iu8dsgg==}
    engines: {node: '>=18'}

  gopd@1.2.0:
    resolution: {integrity: sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==}
    engines: {node: '>= 0.4'}

  graceful-fs@4.2.11:
    resolution: {integrity: sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==}

  hachure-fill@0.5.2:
    resolution: {integrity: sha512-3GKBOn+m2LX9iq+JC1064cSFprJY4jL1jCXTcpnfER5HYE2l/4EfWSGzkPa/ZDBmYI0ZOEj5VHV/eKnPGkHuOg==}

  has-symbols@1.1.0:
    resolution: {integrity: sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==}
    engines: {node: '>= 0.4'}

  has-tostringtag@1.0.2:
    resolution: {integrity: sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw==}
    engines: {node: '>= 0.4'}

  hasown@2.0.2:
    resolution: {integrity: sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==}
    engines: {node: '>= 0.4'}

  hast-util-from-dom@5.0.1:
    resolution: {integrity: sha512-N+LqofjR2zuzTjCPzyDUdSshy4Ma6li7p/c3pA78uTwzFgENbgbUrm2ugwsOdcjI1muO+o6Dgzp9p8WHtn/39Q==}

  hast-util-from-html-isomorphic@2.0.0:
    resolution: {integrity: sha512-zJfpXq44yff2hmE0XmwEOzdWin5xwH+QIhMLOScpX91e/NSGPsAzNCvLQDIEPyO2TXi+lBmU6hjLIhV8MwP2kw==}

  hast-util-from-html@2.0.3:
    resolution: {integrity: sha512-CUSRHXyKjzHov8yKsQjGOElXy/3EKpyX56ELnkHH34vDVw1N1XSQ1ZcAvTyAPtGqLTuKP/uxM+aLkSPqF/EtMw==}

  hast-util-from-parse5@8.0.3:
    resolution: {integrity: sha512-3kxEVkEKt0zvcZ3hCRYI8rqrgwtlIOFMWkbclACvjlDw8Li9S2hk/d51OI0nr/gIpdMHNepwgOKqZ/sy0Clpyg==}

  hast-util-is-element@3.0.0:
    resolution: {integrity: sha512-Val9mnv2IWpLbNPqc/pUem+a7Ipj2aHacCwgNfTiK0vJKl0LF+4Ba4+v1oPHFpf3bLYmreq0/l3Gud9S5OH42g==}

  hast-util-parse-selector@4.0.0:
    resolution: {integrity: sha512-wkQCkSYoOGCRKERFWcxMVMOcYE2K1AaNLU8DXS9arxnLOUEWbOXKXiJUNzEpqZ3JOKpnha3jkFrumEjVliDe7A==}

  hast-util-raw@9.1.0:
    resolution: {integrity: sha512-Y8/SBAHkZGoNkpzqqfCldijcuUKh7/su31kEBp67cFY09Wy0mTRgtsLYsiIxMJxlu0f6AA5SUTbDR8K0rxnbUw==}

  hast-util-to-html@9.0.5:
    resolution: {integrity: sha512-OguPdidb+fbHQSU4Q4ZiLKnzWo8Wwsf5bZfbvu7//a9oTYoqD/fWpe96NuHkoS9h0ccGOTe0C4NGXdtS0iObOw==}

  hast-util-to-jsx-runtime@2.3.6:
    resolution: {integrity: sha512-zl6s8LwNyo1P9uw+XJGvZtdFF1GdAkOg8ujOw+4Pyb76874fLps4ueHXDhXWdk6YHQ6OgUtinliG7RsYvCbbBg==}

  hast-util-to-parse5@8.0.0:
    resolution: {integrity: sha512-3KKrV5ZVI8if87DVSi1vDeByYrkGzg4mEfeu4alwgmmIeARiBLKCZS2uw5Gb6nU9x9Yufyj3iudm6i7nl52PFw==}

  hast-util-to-text@4.0.2:
    resolution: {integrity: sha512-KK6y/BN8lbaq654j7JgBydev7wuNMcID54lkRav1P0CaE1e47P72AWWPiGKXTJU271ooYzcvTAn/Zt0REnvc7A==}

  hast-util-whitespace@3.0.0:
    resolution: {integrity: sha512-88JUN06ipLwsnv+dVn+OIYOvAuvBMy/Qoi6O7mQHxdPXpjy+Cd6xRkWwux7DKO+4sYILtLBRIKgsdpS2gQc7qw==}

  hastscript@9.0.1:
    resolution: {integrity: sha512-g7df9rMFX/SPi34tyGCyUBREQoKkapwdY/T04Qn9TDWfHhAYt4/I0gMVirzK5wEzeUqIjEB+LXC/ypb7Aqno5w==}

  heic2any@0.0.4:
    resolution: {integrity: sha512-3lLnZiDELfabVH87htnRolZ2iehX9zwpRyGNz22GKXIu0fznlblf0/ftppXKNqS26dqFSeqfIBhAmAj/uSp0cA==}

  html-url-attributes@3.0.1:
    resolution: {integrity: sha512-ol6UPyBWqsrO6EJySPz2O7ZSr856WDrEzM5zMqp+FJJLGMW35cLYmmZnl0vztAZxRUoNZJFTCohfjuIJ8I4QBQ==}

  html-void-elements@3.0.0:
    resolution: {integrity: sha512-bEqo66MRXsUGxWHV5IP0PUiAWwoEjba4VCzg0LjFJBpchPaTfyfCKTG6bc5F8ucKec3q5y6qOdGyYTSBEvhCrg==}

  http-errors@2.0.0:
    resolution: {integrity: sha512-FtwrG/euBzaEjYeRqOgly7G0qviiXoJWnvEH2Z1plBdXgbyjv34pHTSb9zoeHMyDy33+DWy5Wt9Wo+TURtOYSQ==}
    engines: {node: '>= 0.8'}

  iconv-lite@0.4.24:
    resolution: {integrity: sha512-v3MXnZAcvnywkTUEZomIActle7RXXeedOR31wwl7VlyoXO4Qi9arvSenNQWne1TcRwhCL1HwLI21bEqdpj8/rA==}
    engines: {node: '>=0.10.0'}

  iconv-lite@0.6.3:
    resolution: {integrity: sha512-4fCk79wshMdzMp2rH06qWrJE4iolqLhCUH+OiuIgU++RB0+94NlDL81atO7GX55uUKueo0txHNtvEyI6D7WdMw==}
    engines: {node: '>=0.10.0'}

  iconv-lite@0.7.3:
    resolution: {integrity: sha512-IKXpvIzjnC9XTAUbVBcMfGS0EPaIXtW6v+zr+RRp+hqULEpo0owZax6wyRwPOJbWbzjYspQwusTsfVr0ifh4uQ==}
    engines: {node: '>=0.10.0'}

  immediate@3.0.6:
    resolution: {integrity: sha512-XXOFtyqDjNDAQxVfYxuF7g9Il/IbWmmlQg2MYKOH8ExIT1qg6xc4zyS3HaEEATgs1btfzxq15ciUiY7gjSXRGQ==}

  inherits@2.0.4:
    resolution: {integrity: sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==}

  inline-style-parser@0.2.4:
    resolution: {integrity: sha512-0aO8FkhNZlj/ZIbNi7Lxxr12obT7cL1moPfE4tg1LkX7LlLfC6DeX4l2ZEud1ukP9jNQyNnfzQVqwbwmAATY4Q==}

  input-otp@1.4.2:
    resolution: {integrity: sha512-l3jWwYNvrEa6NTCt7BECfCm48GvwuZzkoeG3gBL2w4CHeOXW3eKFmf9UNYkNfYc3mxMrthMnxjIE07MT0zLBQA==}
    peerDependencies:
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0.0 || ^19.0.0-rc

  internmap@1.0.1:
    resolution: {integrity: sha512-lDB5YccMydFBtasVtxnZ3MRBHuaoE8GKsppq+EchKL2U4nK/DmEpPHNH8MZe5HkMtpSiTSOZwfN0tzYjO/lJEw==}

  internmap@2.0.3:
    resolution: {integrity: sha512-5Hh7Y1wQbvY5ooGgPbDaL5iYLAPzMTUrjMulskHLH6wnv/A+1q5rgEaiuqEjB+oxGXIVZs1FF+R/KPN3ZSQYYg==}
    engines: {node: '>=12'}

  ipaddr.js@1.9.1:
    resolution: {integrity: sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==}
    engines: {node: '>= 0.10'}

  is-alphabetical@2.0.1:
    resolution: {integrity: sha512-FWyyY60MeTNyeSRpkM2Iry0G9hpr7/9kD40mD/cGQEuilcZYS4okz8SN2Q6rLCJ8gbCt6fN+rC+6tMGS99LaxQ==}

  is-alphanumerical@2.0.1:
    resolution: {integrity: sha512-hmbYhX/9MUMF5uh7tOXyK/n0ZvWpad5caBA17GsC6vyuCqaWliRG5K1qS9inmUhEMaOBIW7/whAnSwveW/LtZw==}

  is-decimal@2.0.1:
    resolution: {integrity: sha512-AAB9hiomQs5DXWcRB1rqsxGUstbRroFOPPVAomNk/3XHR5JyEZChOyTWe2oayKnsSsr/kcGqF+z6yuH6HHpN0A==}

  is-hexadecimal@2.0.1:
    resolution: {integrity: sha512-DgZQp241c8oO6cA1SbTEWiXeoxV42vlcJxgH+B3hi1AiqqKruZR3ZGF8In3fj4+/y/7rHvlOZLZtgJ/4ttYGZg==}

  is-plain-obj@4.1.0:
    resolution: {integrity: sha512-+Pgi+vMuUNkJyExiMBt5IlFoMyKnr5zhJ4Uspz58WOhBF5QoIZkFyNHIbBAtHwzVAgk5RtndVNsDRN61/mmDqg==}
    engines: {node: '>=12'}

  is-property@1.0.2:
    resolution: {integrity: sha512-Ks/IoX00TtClbGQr4TWXemAnktAQvYB7HzcCxDGqEZU6oCmb2INHuOoKxbtR+HFkmYWBKv/dOZtGRiAjDhj92g==}

  is-what@4.1.16:
    resolution: {integrity: sha512-ZhMwEosbFJkA0YhFnNDgTM4ZxDRsS6HqTo7qsZM08fehyRYIYa0yHu5R6mgo1n/8MgaPBXiPimPD77baVFYg+A==}
    engines: {node: '>=12.13'}

  isarray@1.0.0:
    resolution: {integrity: sha512-VLghIWNM6ELQzo7zwmcg0NmTVyWKYjvIeM83yjp0wRDTmUnrM678fQbcKBo6n2CJEF0szoG//ytg+TKla89ALQ==}

  jiti@2.6.1:
    resolution: {integrity: sha512-ekilCSN1jwRvIbgeg/57YFh8qQDNbwDb9xT/qu2DAHbFFZUicIl4ygVaAvzveMhMVr3LnpSKTNnwt8PoOfmKhQ==}
    hasBin: true

  jose@6.1.0:
    resolution: {integrity: sha512-TTQJyoEoKcC1lscpVDCSsVgYzUDg/0Bt3WE//WiTPK6uOCQC2KZS4MpugbMWt/zyjkopgZoXhZuCi00gLudfUA==}

  js-tokens@4.0.0:
    resolution: {integrity: sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==}

  jsesc@3.1.0:
    resolution: {integrity: sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==}
    engines: {node: '>=6'}
    hasBin: true

  json5@2.2.3:
    resolution: {integrity: sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==}
    engines: {node: '>=6'}
    hasBin: true

  jszip@3.10.1:
    resolution: {integrity: sha512-xXDvecyTpGLrqFrvkrUSoxxfJI5AH7U8zxxtVclpsUtMCq4JQ290LY8AW5c7Ggnr/Y/oK+bQMbqK2qmtk3pN4g==}

  katex@0.16.25:
    resolution: {integrity: sha512-woHRUZ/iF23GBP1dkDQMh1QBad9dmr8/PAwNA54VrSOVYgI12MAcE14TqnDdQOdzyEonGzMepYnqBMYdsoAr8Q==}
    hasBin: true

  khroma@2.1.0:
    resolution: {integrity: sha512-Ls993zuzfayK269Svk9hzpeGUKob/sIgZzyHYdjQoAdQetRKpOLj+k/QQQ/6Qi0Yz65mlROrfd+Ev+1+7dz9Kw==}

  kolorist@1.8.0:
    resolution: {integrity: sha512-Y+60/zizpJ3HRH8DCss+q95yr6145JXZo46OTpFvDZWLfRCE4qChOyk1b26nMaNpfHHgxagk9dXT5OP0Tfe+dQ==}

  langium@3.3.1:
    resolution: {integrity: sha512-QJv/h939gDpvT+9SiLVlY7tZC3xB2qK57v0J04Sh9wpMb6MP1q8gB21L3WIo8T5P1MSMg3Ep14L7KkDCFG3y4w==}
    engines: {node: '>=16.0.0'}

  layout-base@1.0.2:
    resolution: {integrity: sha512-8h2oVEZNktL4BH2JCOI90iD1yXwL6iNW7KcCKT2QZgQJR2vbqDsldCTPRU9NifTCqHZci57XvQQ15YTu+sTYPg==}

  layout-base@2.0.1:
    resolution: {integrity: sha512-dp3s92+uNI1hWIpPGH3jK2kxE2lMjdXdr+DH8ynZHpd6PUlH6x6cbuXnoMmiNumznqaNO31xu9e79F0uuZ0JFg==}

  lie@3.3.0:
    resolution: {integrity: sha512-UaiMJzeWRlEujzAuw5LokY1L5ecNQYZKfmyZ9L7wDHb/p5etKaxXhohBcrw0EYby+G/NA52vRSN4N39dxHAIwQ==}

  lightningcss-darwin-arm64@1.30.1:
    resolution: {integrity: sha512-c8JK7hyE65X1MHMN+Viq9n11RRC7hgin3HhYKhrMyaXflk5GVplZ60IxyoVtzILeKr+xAJwg6zK6sjTBJ0FKYQ==}
    engines: {node: '>= 12.0.0'}
    cpu: [arm64]
    os: [darwin]

  lightningcss-darwin-x64@1.30.1:
    resolution: {integrity: sha512-k1EvjakfumAQoTfcXUcHQZhSpLlkAuEkdMBsI/ivWw9hL+7FtilQc0Cy3hrx0AAQrVtQAbMI7YjCgYgvn37PzA==}
    engines: {node: '>= 12.0.0'}
    cpu: [x64]
    os: [darwin]

  lightningcss-freebsd-x64@1.30.1:
    resolution: {integrity: sha512-kmW6UGCGg2PcyUE59K5r0kWfKPAVy4SltVeut+umLCFoJ53RdCUWxcRDzO1eTaxf/7Q2H7LTquFHPL5R+Gjyig==}
    engines: {node: '>= 12.0.0'}
    cpu: [x64]
    os: [freebsd]

  lightningcss-linux-arm-gnueabihf@1.30.1:
    resolution: {integrity: sha512-MjxUShl1v8pit+6D/zSPq9S9dQ2NPFSQwGvxBCYaBYLPlCWuPh9/t1MRS8iUaR8i+a6w7aps+B4N0S1TYP/R+Q==}
    engines: {node: '>= 12.0.0'}
    cpu: [arm]
    os: [linux]

  lightningcss-linux-arm64-gnu@1.30.1:
    resolution: {integrity: sha512-gB72maP8rmrKsnKYy8XUuXi/4OctJiuQjcuqWNlJQ6jZiWqtPvqFziskH3hnajfvKB27ynbVCucKSm2rkQp4Bw==}
    engines: {node: '>= 12.0.0'}
    cpu: [arm64]
    os: [linux]

  lightningcss-linux-arm64-musl@1.30.1:
    resolution: {integrity: sha512-jmUQVx4331m6LIX+0wUhBbmMX7TCfjF5FoOH6SD1CttzuYlGNVpA7QnrmLxrsub43ClTINfGSYyHe2HWeLl5CQ==}
    engines: {node: '>= 12.0.0'}
    cpu: [arm64]
    os: [linux]

  lightningcss-linux-x64-gnu@1.30.1:
    resolution: {integrity: sha512-piWx3z4wN8J8z3+O5kO74+yr6ze/dKmPnI7vLqfSqI8bccaTGY5xiSGVIJBDd5K5BHlvVLpUB3S2YCfelyJ1bw==}
    engines: {node: '>= 12.0.0'}
    cpu: [x64]
    os: [linux]

  lightningcss-linux-x64-musl@1.30.1:
    resolution: {integrity: sha512-rRomAK7eIkL+tHY0YPxbc5Dra2gXlI63HL+v1Pdi1a3sC+tJTcFrHX+E86sulgAXeI7rSzDYhPSeHHjqFhqfeQ==}
    engines: {node: '>= 12.0.0'}
    cpu: [x64]
    os: [linux]

  lightningcss-win32-arm64-msvc@1.30.1:
    resolution: {integrity: sha512-mSL4rqPi4iXq5YVqzSsJgMVFENoa4nGTT/GjO2c0Yl9OuQfPsIfncvLrEW6RbbB24WtZ3xP/2CCmI3tNkNV4oA==}
    engines: {node: '>= 12.0.0'}
    cpu: [arm64]
    os: [win32]

  lightningcss-win32-x64-msvc@1.30.1:
    resolution: {integrity: sha512-PVqXh48wh4T53F/1CCu8PIPCxLzWyCnn/9T5W1Jpmdy5h9Cwd+0YQS6/LwhHXSafuc61/xg9Lv5OrCby6a++jg==}
    engines: {node: '>= 12.0.0'}
    cpu: [x64]
    os: [win32]

  lightningcss@1.30.1:
    resolution: {integrity: sha512-xi6IyHML+c9+Q3W0S4fCQJOym42pyurFiJUHEcEyHS0CeKzia4yZDEsLlqOFykxOdHpNy0NmvVO31vcSqAxJCg==}
    engines: {node: '>= 12.0.0'}

  local-pkg@1.1.2:
    resolution: {integrity: sha512-arhlxbFRmoQHl33a0Zkle/YWlmNwoyt6QNZEIJcqNbdrsix5Lvc4HyyI3EnwxTYlZYc32EbYrQ8SzEZ7dqgg9A==}
    engines: {node: '>=14'}

  lodash-es@4.17.21:
    resolution: {integrity: sha512-mKnC+QJ9pWVzv+C4/U3rRsHapFfHvQFoFB92e52xeyGMcX6/OlIl78je1u8vePzYZSkkogMPJ2yjxxsb89cxyw==}

  lodash@4.17.21:
    resolution: {integrity: sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==}

  long@5.3.2:
    resolution: {integrity: sha512-mNAgZ1GmyNhD7AuqnTG3/VQ26o760+ZYBPKjPvugO8+nLbYfX6TVpJPseBvopbdY+qpZ/lKUnmEc1LeZYS3QAA==}

  longest-streak@3.1.0:
    resolution: {integrity: sha512-9Ri+o0JYgehTaVBBDoMqIl8GXtbWg711O3srftcHhZ0dqnETqLaoIK0x17fUw9rFSlK/0NlsKe0Ahhyl5pXE2g==}

  loose-envify@1.4.0:
    resolution: {integrity: sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==}
    hasBin: true

  loupe@3.2.1:
    resolution: {integrity: sha512-CdzqowRJCeLU72bHvWqwRBBlLcMEtIvGrlvef74kMnV2AolS9Y8xUv1I0U/MNAWMhBlKIoyuEgoJ0t/bbwHbLQ==}

  lru-cache@5.1.1:
    resolution: {integrity: sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==}

  lru.min@1.1.4:
    resolution: {integrity: sha512-DqC6n3QQ77zdFpCMASA1a3Jlb64Hv2N2DciFGkO/4L9+q/IpIAuRlKOvCXabtRW6cQf8usbmM6BE/TOPysCdIA==}
    engines: {bun: '>=1.0.0', deno: '>=1.30.0', node: '>=8.0.0'}

  lucide-react@0.453.0:
    resolution: {integrity: sha512-kL+RGZCcJi9BvJtzg2kshO192Ddy9hv3ij+cPrVPWSRzgCWCVazoQJxOjAwgK53NomL07HB7GPHW120FimjNhQ==}
    peerDependencies:
      react: ^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0-rc

  lucide-react@0.542.0:
    resolution: {integrity: sha512-w3hD8/SQB7+lzU2r4VdFyzzOzKnUjTZIF/MQJGSSvni7Llewni4vuViRppfRAa2guOsY5k4jZyxw/i9DQHv+dw==}
    peerDependencies:
      react: ^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0

  magic-string@0.30.19:
    resolution: {integrity: sha512-2N21sPY9Ws53PZvsEpVtNuSW+ScYbQdp4b9qUaL+9QkHUrGFKo56Lg9Emg5s9V/qrtNBmiR01sYhUOwu3H+VOw==}

  markdown-table@3.0.4:
    resolution: {integrity: sha512-wiYz4+JrLyb/DqW2hkFJxP7Vd7JuTDm77fvbM8VfEQdmSMqcImWeeRbHwZjBjIFki/VaMK2BhFi7oUUZeM5bqw==}

  marked@16.4.1:
    resolution: {integrity: sha512-ntROs7RaN3EvWfy3EZi14H4YxmT6A5YvywfhO+0pm+cH/dnSQRmdAmoFIc3B9aiwTehyk7pESH4ofyBY+V5hZg==}
    engines: {node: '>= 20'}
    hasBin: true

  math-intrinsics@1.1.0:
    resolution: {integrity: sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==}
    engines: {node: '>= 0.4'}

  mdast-util-find-and-replace@3.0.2:
    resolution: {integrity: sha512-Tmd1Vg/m3Xz43afeNxDIhWRtFZgM2VLyaf4vSTYwudTyeuTneoL3qtWMA5jeLyz/O1vDJmmV4QuScFCA2tBPwg==}

  mdast-util-from-markdown@2.0.2:
    resolution: {integrity: sha512-uZhTV/8NBuw0WHkPTrCqDOl0zVe1BIng5ZtHoDk49ME1qqcjYmmLmOf0gELgcRMxN4w2iuIeVso5/6QymSrgmA==}

  mdast-util-gfm-autolink-literal@2.0.1:
    resolution: {integrity: sha512-5HVP2MKaP6L+G6YaxPNjuL0BPrq9orG3TsrZ9YXbA3vDw/ACI4MEsnoDpn6ZNm7GnZgtAcONJyPhOP8tNJQavQ==}

  mdast-util-gfm-footnote@2.1.0:
    resolution: {integrity: sha512-sqpDWlsHn7Ac9GNZQMeUzPQSMzR6Wv0WKRNvQRg0KqHh02fpTz69Qc1QSseNX29bhz1ROIyNyxExfawVKTm1GQ==}

  mdast-util-gfm-strikethrough@2.0.0:
    resolution: {integrity: sha512-mKKb915TF+OC5ptj5bJ7WFRPdYtuHv0yTRxK2tJvi+BDqbkiG7h7u/9SI89nRAYcmap2xHQL9D+QG/6wSrTtXg==}

  mdast-util-gfm-table@2.0.0:
    resolution: {integrity: sha512-78UEvebzz/rJIxLvE7ZtDd/vIQ0RHv+3Mh5DR96p7cS7HsBhYIICDBCu8csTNWNO6tBWfqXPWekRuj2FNOGOZg==}

  mdast-util-gfm-task-list-item@2.0.0:
    resolution: {integrity: sha512-IrtvNvjxC1o06taBAVJznEnkiHxLFTzgonUdy8hzFVeDun0uTjxxrRGVaNFqkU1wJR3RBPEfsxmU6jDWPofrTQ==}

  mdast-util-gfm@3.1.0:
    resolution: {integrity: sha512-0ulfdQOM3ysHhCJ1p06l0b0VKlhU0wuQs3thxZQagjcjPrlFRqY215uZGHHJan9GEAXd9MbfPjFJz+qMkVR6zQ==}

  mdast-util-math@3.0.0:
    resolution: {integrity: sha512-Tl9GBNeG/AhJnQM221bJR2HPvLOSnLE/T9cJI9tlc6zwQk2nPk/4f0cHkOdEixQPC/j8UtKDdITswvLAy1OZ1w==}

  mdast-util-mdx-expression@2.0.1:
    resolution: {integrity: sha512-J6f+9hUp+ldTZqKRSg7Vw5V6MqjATc+3E4gf3CFNcuZNWD8XdyI6zQ8GqH7f8169MM6P7hMBRDVGnn7oHB9kXQ==}

  mdast-util-mdx-jsx@3.2.0:
    resolution: {integrity: sha512-lj/z8v0r6ZtsN/cGNNtemmmfoLAFZnjMbNyLzBafjzikOM+glrjNHPlf6lQDOTccj9n5b0PPihEBbhneMyGs1Q==}

  mdast-util-mdxjs-esm@2.0.1:
    resolution: {integrity: sha512-EcmOpxsZ96CvlP03NghtH1EsLtr0n9Tm4lPUJUBccV9RwUOneqSycg19n5HGzCf+10LozMRSObtVr3ee1WoHtg==}

  mdast-util-phrasing@4.1.0:
    resolution: {integrity: sha512-TqICwyvJJpBwvGAMZjj4J2n0X8QWp21b9l0o7eXyVJ25YNWYbJDVIyD1bZXE6WtV6RmKJVYmQAKWa0zWOABz2w==}

  mdast-util-to-hast@13.2.0:
    resolution: {integrity: sha512-QGYKEuUsYT9ykKBCMOEDLsU5JRObWQusAolFMeko/tYPufNkRffBAQjIE+99jbA87xv6FgmjLtwjh9wBWajwAA==}

  mdast-util-to-markdown@2.1.2:
    resolution: {integrity: sha512-xj68wMTvGXVOKonmog6LwyJKrYXZPvlwabaryTjLh9LuvovB/KAH+kvi8Gjj+7rJjsFi23nkUxRQv1KqSroMqA==}

  mdast-util-to-string@4.0.0:
    resolution: {integrity: sha512-0H44vDimn51F0YwvxSJSm0eCDOJTRlmN0R1yBh4HLj9wiV1Dn0QoXGbvFAWj2hSItVTlCmBF1hqKlIyUBVFLPg==}

  media-typer@0.3.0:
    resolution: {integrity: sha512-dq+qelQ9akHpcOl/gUVRTxVIOkAJ1wR3QAvb4RsVjS8oVoFjDGTc679wJYmUmknUF5HwMLOgb5O+a3KxfWapPQ==}
    engines: {node: '>= 0.6'}

  merge-descriptors@1.0.3:
    resolution: {integrity: sha512-gaNvAS7TZ897/rVaZ0nMtAyxNyi/pdbjbAwUpFQpN70GqnVfOiXpeUUMKRBmzXaSQ8DdTX4/0ms62r2K+hE6mQ==}

  mermaid@11.12.0:
    resolution: {integrity: sha512-ZudVx73BwrMJfCFmSSJT84y6u5brEoV8DOItdHomNLz32uBjNrelm7mg95X7g+C6UoQH/W6mBLGDEDv73JdxBg==}

  methods@1.1.2:
    resolution: {integrity: sha512-iclAHeNqNm68zFtnZ0e+1L2yUIdvzNoauKU4WBA3VvH/vPFieF7qfRlwUZU+DA9P9bPXIS90ulxoUoCH23sV2w==}
    engines: {node: '>= 0.6'}

  micromark-core-commonmark@2.0.3:
    resolution: {integrity: sha512-RDBrHEMSxVFLg6xvnXmb1Ayr2WzLAWjeSATAoxwKYJV94TeNavgoIdA0a9ytzDSVzBy2YKFK+emCPOEibLeCrg==}

  micromark-extension-gfm-autolink-literal@2.1.0:
    resolution: {integrity: sha512-oOg7knzhicgQ3t4QCjCWgTmfNhvQbDDnJeVu9v81r7NltNCVmhPy1fJRX27pISafdjL+SVc4d3l48Gb6pbRypw==}

  micromark-extension-gfm-footnote@2.1.0:
    resolution: {integrity: sha512-/yPhxI1ntnDNsiHtzLKYnE3vf9JZ6cAisqVDauhp4CEHxlb4uoOTxOCJ+9s51bIB8U1N1FJ1RXOKTIlD5B/gqw==}

  micromark-extension-gfm-strikethrough@2.1.0:
    resolution: {integrity: sha512-ADVjpOOkjz1hhkZLlBiYA9cR2Anf8F4HqZUO6e5eDcPQd0Txw5fxLzzxnEkSkfnD0wziSGiv7sYhk/ktvbf1uw==}

  micromark-extension-gfm-table@2.1.1:
    resolution: {integrity: sha512-t2OU/dXXioARrC6yWfJ4hqB7rct14e8f7m0cbI5hUmDyyIlwv5vEtooptH8INkbLzOatzKuVbQmAYcbWoyz6Dg==}

  micromark-extension-gfm-tagfilter@2.0.0:
    resolution: {integrity: sha512-xHlTOmuCSotIA8TW1mDIM6X2O1SiX5P9IuDtqGonFhEK0qgRI4yeC6vMxEV2dgyr2TiD+2PQ10o+cOhdVAcwfg==}

  micromark-extension-gfm-task-list-item@2.1.0:
    resolution: {integrity: sha512-qIBZhqxqI6fjLDYFTBIa4eivDMnP+OZqsNwmQ3xNLE4Cxwc+zfQEfbs6tzAo2Hjq+bh6q5F+Z8/cksrLFYWQQw==}

  micromark-extension-gfm@3.0.0:
    resolution: {integrity: sha512-vsKArQsicm7t0z2GugkCKtZehqUm31oeGBV/KVSorWSy8ZlNAv7ytjFhvaryUiCUJYqs+NoE6AFhpQvBTM6Q4w==}

  micromark-extension-math@3.1.0:
    resolution: {integrity: sha512-lvEqd+fHjATVs+2v/8kg9i5Q0AP2k85H0WUOwpIVvUML8BapsMvh1XAogmQjOCsLpoKRCVQqEkQBB3NhVBcsOg==}

  micromark-factory-destination@2.0.1:
    resolution: {integrity: sha512-Xe6rDdJlkmbFRExpTOmRj9N3MaWmbAgdpSrBQvCFqhezUn4AHqJHbaEnfbVYYiexVSs//tqOdY/DxhjdCiJnIA==}

  micromark-factory-label@2.0.1:
    resolution: {integrity: sha512-VFMekyQExqIW7xIChcXn4ok29YE3rnuyveW3wZQWWqF4Nv9Wk5rgJ99KzPvHjkmPXF93FXIbBp6YdW3t71/7Vg==}

  micromark-factory-space@2.0.1:
    resolution: {integrity: sha512-zRkxjtBxxLd2Sc0d+fbnEunsTj46SWXgXciZmHq0kDYGnck/ZSGj9/wULTV95uoeYiK5hRXP2mJ98Uo4cq/LQg==}

  micromark-factory-title@2.0.1:
    resolution: {integrity: sha512-5bZ+3CjhAd9eChYTHsjy6TGxpOFSKgKKJPJxr293jTbfry2KDoWkhBb6TcPVB4NmzaPhMs1Frm9AZH7OD4Cjzw==}

  micromark-factory-whitespace@2.0.1:
    resolution: {integrity: sha512-Ob0nuZ3PKt/n0hORHyvoD9uZhr+Za8sFoP+OnMcnWK5lngSzALgQYKMr9RJVOWLqQYuyn6ulqGWSXdwf6F80lQ==}

  micromark-util-character@2.1.1:
    resolution: {integrity: sha512-wv8tdUTJ3thSFFFJKtpYKOYiGP2+v96Hvk4Tu8KpCAsTMs6yi+nVmGh1syvSCsaxz45J6Jbw+9DD6g97+NV67Q==}

  micromark-util-chunked@2.0.1:
    resolution: {integrity: sha512-QUNFEOPELfmvv+4xiNg2sRYeS/P84pTW0TCgP5zc9FpXetHY0ab7SxKyAQCNCc1eK0459uoLI1y5oO5Vc1dbhA==}

  micromark-util-classify-character@2.0.1:
    resolution: {integrity: sha512-K0kHzM6afW/MbeWYWLjoHQv1sgg2Q9EccHEDzSkxiP/EaagNzCm7T/WMKZ3rjMbvIpvBiZgwR3dKMygtA4mG1Q==}

  micromark-util-combine-extensions@2.0.1:
    resolution: {integrity: sha512-OnAnH8Ujmy59JcyZw8JSbK9cGpdVY44NKgSM7E9Eh7DiLS2E9RNQf0dONaGDzEG9yjEl5hcqeIsj4hfRkLH/Bg==}

  micromark-util-decode-numeric-character-reference@2.0.2:
    resolution: {integrity: sha512-ccUbYk6CwVdkmCQMyr64dXz42EfHGkPQlBj5p7YVGzq8I7CtjXZJrubAYezf7Rp+bjPseiROqe7G6foFd+lEuw==}

  micromark-util-decode-string@2.0.1:
    resolution: {integrity: sha512-nDV/77Fj6eH1ynwscYTOsbK7rR//Uj0bZXBwJZRfaLEJ1iGBR6kIfNmlNqaqJf649EP0F3NWNdeJi03elllNUQ==}

  micromark-util-encode@2.0.1:
    resolution: {integrity: sha512-c3cVx2y4KqUnwopcO9b/SCdo2O67LwJJ/UyqGfbigahfegL9myoEFoDYZgkT7f36T0bLrM9hZTAaAyH+PCAXjw==}

  micromark-util-html-tag-name@2.0.1:
    resolution: {integrity: sha512-2cNEiYDhCWKI+Gs9T0Tiysk136SnR13hhO8yW6BGNyhOC4qYFnwF1nKfD3HFAIXA5c45RrIG1ub11GiXeYd1xA==}

  micromark-util-normalize-identifier@2.0.1:
    resolution: {integrity: sha512-sxPqmo70LyARJs0w2UclACPUUEqltCkJ6PhKdMIDuJ3gSf/Q+/GIe3WKl0Ijb/GyH9lOpUkRAO2wp0GVkLvS9Q==}

  micromark-util-resolve-all@2.0.1:
    resolution: {integrity: sha512-VdQyxFWFT2/FGJgwQnJYbe1jjQoNTS4RjglmSjTUlpUMa95Htx9NHeYW4rGDJzbjvCsl9eLjMQwGeElsqmzcHg==}

  micromark-util-sanitize-uri@2.0.1:
    resolution: {integrity: sha512-9N9IomZ/YuGGZZmQec1MbgxtlgougxTodVwDzzEouPKo3qFWvymFHWcnDi2vzV1ff6kas9ucW+o3yzJK9YB1AQ==}

  micromark-util-subtokenize@2.1.0:
    resolution: {integrity: sha512-XQLu552iSctvnEcgXw6+Sx75GflAPNED1qx7eBJ+wydBb2KCbRZe+NwvIEEMM83uml1+2WSXpBAcp9IUCgCYWA==}

  micromark-util-symbol@2.0.1:
    resolution: {integrity: sha512-vs5t8Apaud9N28kgCrRUdEed4UJ+wWNvicHLPxCa9ENlYuAY31M0ETy5y1vA33YoNPDFTghEbnh6efaE8h4x0Q==}

  micromark-util-types@2.0.2:
    resolution: {integrity: sha512-Yw0ECSpJoViF1qTU4DC6NwtC4aWGt1EkzaQB8KPPyCRR8z9TWeV0HbEFGTO+ZY1wB22zmxnJqhPyTpOVCpeHTA==}

  micromark@4.0.2:
    resolution: {integrity: sha512-zpe98Q6kvavpCr1NPVSCMebCKfD7CA2NqZ+rykeNhONIJBpc1tFKt9hucLGwha3jNTNI8lHpctWJWoimVF4PfA==}

  mime-db@1.52.0:
    resolution: {integrity: sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==}
    engines: {node: '>= 0.6'}

  mime-types@2.1.35:
    resolution: {integrity: sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==}
    engines: {node: '>= 0.6'}

  mime@1.6.0:
    resolution: {integrity: sha512-x0Vn8spI+wuJ1O6S7gnbaQg8Pxh4NNHb7KSINmEWKiPE4RKOplvijn+NkmYmmRgP68mc70j2EbeTFRsrswaQeg==}
    engines: {node: '>=4'}
    hasBin: true

  minipass@7.1.2:
    resolution: {integrity: sha512-qOOzS1cBTWYF4BH8fVePDBOO9iptMnGUEZwNc/cMWnTV2nVLZ7VoNWEPHkYczZA0pdoA7dl6e7FL659nX9S2aw==}
    engines: {node: '>=16 || 14 >=14.17'}

  minizlib@3.1.0:
    resolution: {integrity: sha512-KZxYo1BUkWD2TVFLr0MQoM8vUUigWD3LlD83a/75BqC+4qE0Hb1Vo5v1FgcfaNXvfXzr+5EhQ6ing/CaBijTlw==}
    engines: {node: '>= 18'}

  mitt@3.0.1:
    resolution: {integrity: sha512-vKivATfr97l2/QBCYAkXYDbrIWPM2IIKEl7YPhjCvKlG3kE2gm+uBo6nEXK3M5/Ffh/FLpKExzOQ3JJoJGFKBw==}

  mlly@1.8.0:
    resolution: {integrity: sha512-l8D9ODSRWLe2KHJSifWGwBqpTZXIXTeo8mlKjY+E2HAakaTeNpqAyBZ8GSqLzHgw4XmHmC8whvpjJNMbFZN7/g==}

  modern-screenshot@4.6.6:
    resolution: {integrity: sha512-8tF0xEpe7yx37mK95UcIghSCWYeu628K2hLJl+ZNY2ANmRzYLlRLpquPHAQcL8keF6BoeEzTEw4GrgmUpGuZ8w==}

  motion-dom@12.23.21:
    resolution: {integrity: sha512-5xDXx/AbhrfgsQmSE7YESMn4Dpo6x5/DTZ4Iyy4xqDvVHWvFVoV+V2Ri2S/ksx+D40wrZ7gPYiMWshkdoqNgNQ==}

  motion-utils@12.23.6:
    resolution: {integrity: sha512-eAWoPgr4eFEOFfg2WjIsMoqJTW6Z8MTUCgn/GZ3VRpClWBdnbjryiA3ZSNLyxCTmCQx4RmYX6jX1iWHbenUPNQ==}

  ms@2.0.0:
    resolution: {integrity: sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==}

  ms@2.1.3:
    resolution: {integrity: sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==}

  mysql2@3.23.4:
    resolution: {integrity: sha512-J1Rgl8Oy5iw3mOBjKeTMQ3cJNjMYtJYavQVXShsMtSj9rKV8Q1+QaGKNJqDVQFcNINqYYp6Vxd90r69cCoBxBA==}
    engines: {node: '>= 8.0'}
    peerDependencies:
      '@types/node': '>= 8'

  named-placeholders@1.1.6:
    resolution: {integrity: sha512-Tz09sEL2EEuv5fFowm419c1+a/jSMiBjI9gHxVLrVdbUkkNUUfjsVYs9pVZu5oCon/kmRh9TfLEObFtkVxmY0w==}
    engines: {node: '>=8.0.0'}

  nanoid@3.3.11:
    resolution: {integrity: sha512-N8SpfPUnUp1bK+PMYW8qSWdl9U+wwNWI4QKxOYDy9JAro3WMX7p2OeVRF9v+347pnakNevPmiHhNmZ2HbFA76w==}
    engines: {node: ^10 || ^12 || ^13.7 || ^14 || >=15.0.1}
    hasBin: true

  nanoid@5.1.6:
    resolution: {integrity: sha512-c7+7RQ+dMB5dPwwCp4ee1/iV/q2P6aK1mTZcfr1BTuVlyW9hJYiMPybJCcnBlQtuSmTIWNeazm/zqNoZSSElBg==}
    engines: {node: ^18 || >=20}
    hasBin: true

  negotiator@0.6.3:
    resolution: {integrity: sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==}
    engines: {node: '>= 0.6'}

  next-themes@0.4.6:
    resolution: {integrity: sha512-pZvgD5L0IEvX5/9GWyHMf3m8BKiVQwsCMHfoFosXtXBMnaS0ZnIJ9ST4b4NqLVKDEm8QBxoNNGNaBv2JNF6XNA==}
    peerDependencies:
      react: ^16.8 || ^17 || ^18 || ^19 || ^19.0.0-rc
      react-dom: ^16.8 || ^17 || ^18 || ^19 || ^19.0.0-rc

  node-releases@2.0.23:
    resolution: {integrity: sha512-cCmFDMSm26S6tQSDpBCg/NR8NENrVPhAJSf+XbxBG4rPFaaonlEoE9wHQmun+cls499TQGSb7ZyPBRlzgKfpeg==}

  normalize-range@0.1.2:
    resolution: {integrity: sha512-bdok/XvKII3nUpklnV6P2hxtMNrCboOjAcyBuQnWEhO665FwrSNRxU+AqpsyvO6LgGYPspN+lu5CLtw4jPRKNA==}
    engines: {node: '>=0.10.0'}

  object-assign@4.1.1:
    resolution: {integrity: sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==}
    engines: {node: '>=0.10.0'}

  object-inspect@1.13.4:
    resolution: {integrity: sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==}
    engines: {node: '>= 0.4'}

  on-finished@2.4.1:
    resolution: {integrity: sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==}
    engines: {node: '>= 0.8'}

  oniguruma-parser@0.12.1:
    resolution: {integrity: sha512-8Unqkvk1RYc6yq2WBYRj4hdnsAxVze8i7iPfQr8e4uSP3tRv0rpZcbGUDvxfQQcdwHt/e9PrMvGCsa8OqG9X3w==}

  oniguruma-to-es@4.3.3:
    resolution: {integrity: sha512-rPiZhzC3wXwE59YQMRDodUwwT9FZ9nNBwQQfsd1wfdtlKEyCdRV0avrTcSZ5xlIvGRVPd/cx6ZN45ECmS39xvg==}

  package-manager-detector@1.5.0:
    resolution: {integrity: sha512-uBj69dVlYe/+wxj8JOpr97XfsxH/eumMt6HqjNTmJDf/6NO9s+0uxeOneIz3AsPt2m6y9PqzDzd3ATcU17MNfw==}

  pako@1.0.11:
    resolution: {integrity: sha512-4hLB8Py4zZce5s4yd9XzopqwVv/yGNhV1Bl8NTmCq1763HeK2+EwVTv+leGeL13Dnh2wfbqowVPXCIO0z4taYw==}

  parse-entities@4.0.2:
    resolution: {integrity: sha512-GG2AQYWoLgL877gQIKeRPGO1xF9+eG1ujIb5soS5gPvLQ1y2o8FL90w2QWNdf9I361Mpp7726c+lj3U0qK1uGw==}

  parse5@7.3.0:
    resolution: {integrity: sha512-IInvU7fabl34qmi9gY8XOVxhYyMyuH2xUNpb2q8/Y+7552KlejkRvqvD19nMoUW/uQGGbqNpA6Tufu5FL5BZgw==}

  parseurl@1.3.3:
    resolution: {integrity: sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==}
    engines: {node: '>= 0.8'}

  path-data-parser@0.1.0:
    resolution: {integrity: sha512-NOnmBpt5Y2RWbuv0LMzsayp3lVylAHLPUTut412ZA3l+C4uw4ZVkQbjShYCQ8TCpUMdPapr4YjUqLYD6v68j+w==}

  path-to-regexp@0.1.12:
    resolution: {integrity: sha512-RA1GjUVMnvYFxuqovrEqZoxxW5NUZqbwKtYz/Tt7nXerk0LbLblQmrsgdeOxV5SFHf0UDggjS/bSeOZwt1pmEQ==}

  pathe@1.1.2:
    resolution: {integrity: sha512-whLdWMYL2TwI08hn8/ZqAbrVemu0LNaNNJZX73O6qaIdCTfXutsLhMkjdENX0qhsQ9uIimo4/aQOmXkoon2nDQ==}

  pathe@2.0.3:
    resolution: {integrity: sha512-WUjGcAqP1gQacoQe+OBJsFA7Ld4DyXuUIjZ5cc75cLHvJ7dtNsTugphxIADwspS+AraAUePCKrSVtPLFj/F88w==}

  pathval@2.0.1:
    resolution: {integrity: sha512-//nshmD55c46FuFw26xV/xFAaB5HF9Xdap7HJBBnrKdAd6/GxDBaNA1870O79+9ueg61cZLSVc+OaFlfmObYVQ==}
    engines: {node: '>= 14.16'}

  picocolors@1.1.1:
    resolution: {integrity: sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==}

  picomatch@4.0.3:
    resolution: {integrity: sha512-5gTmgEY/sqK6gFXLIsQNH19lWb4ebPDLA4SdLP7dsWkIXHWlG66oPuVvXSGFPppYZz8ZDZq0dYYrbHfBCVUb1Q==}
    engines: {node: '>=12'}

  pkg-types@1.3.1:
    resolution: {integrity: sha512-/Jm5M4RvtBFVkKWRu2BLUTNP8/M2a+UwuAX+ae4770q1qVGtfjG+WTCupoZixokjmHiry8uI+dlY8KXYV5HVVQ==}

  pkg-types@2.3.0:
    resolution: {integrity: sha512-SIqCzDRg0s9npO5XQ3tNZioRY1uK06lA41ynBC1YmFTmnY6FjUjVt6s4LoADmwoig1qqD0oK8h1p/8mlMx8Oig==}

  playwright-core@1.62.1:
    resolution: {integrity: sha512-wPYSwEBJY9GHraISXqyqtx0na0LpO3XEX7jNDhntbex7tzUS7kLnZsOlFruFJB4Hi/rhDMjXGqHewDZ68nYZVw==}
    engines: {node: '>=20'}
    hasBin: true

  pngjs@7.0.0:
    resolution: {integrity: sha512-LKWqWJRhstyYo9pGvgor/ivk2w94eSjE3RGVuzLGlr3NmD8bf7RcYGze1mNdEHRP6TRP6rMuDHk5t44hnTRyow==}
    engines: {node: '>=14.19.0'}

  pnpm@10.18.1:
    resolution: {integrity: sha512-d6iEoWXLui2NHBnjtIgO7m0vyr0Nh5Eh4oIZa4AEI1HV6zygk1+lmdodxRJlzGiBatK93Sot5eqf35KtvsfNNA==}
    engines: {node: '>=18.12'}
    hasBin: true

  points-on-curve@0.2.0:
    resolution: {integrity: sha512-0mYKnYYe9ZcqMCWhUjItv/oHjvgEsfKvnUTg8sAtnHr3GVy7rGkXCb6d5cSyqrWqL4k81b9CPg3urd+T7aop3A==}

  points-on-path@0.2.1:
    resolution: {integrity: sha512-25ClnWWuw7JbWZcgqY/gJ4FQWadKxGWk+3kR/7kD0tCaDtPPMj7oHu2ToLaVhfpnHrZzYby2w6tUA0eOIuUg8g==}

  postcss-selector-parser@6.0.10:
    resolution: {integrity: sha512-IQ7TZdoaqbT+LCpShg46jnZVlhWD2w6iQYAcYXfHARZ7X1t/UGhhceQDs5X0cGqKvYlHNOuv7Oa1xmb0oQuA3w==}
    engines: {node: '>=4'}

  postcss-value-parser@4.2.0:
    resolution: {integrity: sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==}

  postcss@8.5.6:
    resolution: {integrity: sha512-3Ybi1tAuwAP9s0r1UQ2J4n5Y0G05bJkpUIO0/bI9MhwmD70S5aTWbXGBwxHrelT+XM1k6dM0pk+SwNkpTRN7Pg==}
    engines: {node: ^10 || ^12 || >=14}

  prettier@3.6.2:
    resolution: {integrity: sha512-I7AIg5boAr5R0FFtJ6rCfD+LFsWHp81dolrFD8S79U9tb8Az2nGrJncnMSnys+bpQJfRUzqs9hnA81OAA3hCuQ==}
    engines: {node: '>=14'}
    hasBin: true

  process-nextick-args@2.0.1:
    resolution: {integrity: sha512-3ouUOpQhtgrbOa17J7+uxOTpITYWaGP7/AhoR3+A+/1e9skrzelGi/dXzEYyvbxubEF6Wn2ypscTKiKJFFn1ag==}

  prop-types@15.8.1:
    resolution: {integrity: sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg==}

  property-information@6.5.0:
    resolution: {integrity: sha512-PgTgs/BlvHxOu8QuEN7wi5A0OmXaBcHpmCSTehcs6Uuu9IkDIEo13Hy7n898RHfrQ49vKCoGeWZSaAK01nwVig==}

  property-information@7.1.0:
    resolution: {integrity: sha512-TwEZ+X+yCJmYfL7TPUOcvBZ4QfoT5YenQiJuX//0th53DE6w0xxLEtfK3iyryQFddXuvkIk51EEgrJQ0WJkOmQ==}

  proxy-addr@2.0.7:
    resolution: {integrity: sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==}
    engines: {node: '>= 0.10'}

  proxy-from-env@1.1.0:
    resolution: {integrity: sha512-D+zkORCbA9f1tdWRK0RaCR3GPv50cMxcrz4X8k5LTSUD1Dkw47mKJEZQNunItRTkWwgtaUSo1RVFRIG9ZXiFYg==}

  qs@6.13.0:
    resolution: {integrity: sha512-+38qI9SOr8tfZ4QmJNplMUxqjbe7LKvvZgWdExBOmd+egZTtjLB67Gu0HRX3u/XOq7UU2Nx6nsjvS16Z9uwfpg==}
    engines: {node: '>=0.6'}

  quansync@0.2.11:
    resolution: {integrity: sha512-AifT7QEbW9Nri4tAwR5M/uzpBuqfZf+zwaEM/QkzEjj7NBuFD2rBuy0K3dE+8wltbezDV7JMA0WfnCPYRSYbXA==}

  range-parser@1.2.1:
    resolution: {integrity: sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==}
    engines: {node: '>= 0.6'}

  raw-body@2.5.2:
    resolution: {integrity: sha512-8zGqypfENjCIqGhgXToC8aB2r7YrBX+AQAfIPs/Mlk+BtPTztOvTS01NRW/3Eh60J+a48lt8qsCzirQ6loCVfA==}
    engines: {node: '>= 0.8'}

  react-day-picker@9.11.1:
    resolution: {integrity: sha512-l3ub6o8NlchqIjPKrRFUCkTUEq6KwemQlfv3XZzzwpUeGwmDJ+0u0Upmt38hJyd7D/vn2dQoOoLV/qAp0o3uUw==}
    engines: {node: '>=18'}
    peerDependencies:
      react: '>=16.8.0'

  react-dom@19.2.1:
    resolution: {integrity: sha512-ibrK8llX2a4eOskq1mXKu/TGZj9qzomO+sNfO98M6d9zIPOEhlBkMkBUBLd1vgS0gQsLDBzA+8jJBVXDnfHmJg==}
    peerDependencies:
      react: ^19.2.1

  react-hook-form@7.64.0:
    resolution: {integrity: sha512-fnN+vvTiMLnRqKNTVhDysdrUay0kUUAymQnFIznmgDvapjveUWOOPqMNzPg+A+0yf9DuE2h6xzBjN1s+Qx8wcg==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^16.8.0 || ^17 || ^18 || ^19

  react-is@16.13.1:
    resolution: {integrity: sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ==}

  react-is@18.3.1:
    resolution: {integrity: sha512-/LLMVyas0ljjAtoYiPqYiL8VWXzUUdThrmU5+n20DZv+a+ClRoevUzw5JxU+Ieh5/c87ytoTBV9G1FiKfNJdmg==}

  react-markdown@10.1.0:
    resolution: {integrity: sha512-qKxVopLT/TyA6BX3Ue5NwabOsAzm0Q7kAPwq6L+wWDwisYs7R8vZ0nRXqq6rkueboxpkjvLGU9fWifiX/ZZFxQ==}
    peerDependencies:
      '@types/react': '>=18'
      react: '>=18'

  react-refresh@0.17.0:
    resolution: {integrity: sha512-z6F7K9bV85EfseRCp2bzrpyQ0Gkw1uLoCel9XBVWPg/TjRj94SkJzUTGfOa4bs7iJvBWtQG0Wq7wnI0syw3EBQ==}
    engines: {node: '>=0.10.0'}

  react-remove-scroll-bar@2.3.8:
    resolution: {integrity: sha512-9r+yi9+mgU33AKcj6IbT9oRCO78WriSj6t/cF8DWBZJ9aOGPOTEDvdUDz1FwKim7QXWwmHqtdHnRJfhAxEG46Q==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0
    peerDependenciesMeta:
      '@types/react':
        optional: true

  react-remove-scroll@2.7.1:
    resolution: {integrity: sha512-HpMh8+oahmIdOuS5aFKKY6Pyog+FNaZV/XyJOq7b4YFwsFHe5yYfdbIalI4k3vU2nSDql7YskmUseHsRrJqIPA==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  react-resizable-panels@3.0.6:
    resolution: {integrity: sha512-b3qKHQ3MLqOgSS+FRYKapNkJZf5EQzuf6+RLiq1/IlTHw99YrZ2NJZLk4hQIzTnnIkRg2LUqyVinu6YWWpUYew==}
    peerDependencies:
      react: ^16.14.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
      react-dom: ^16.14.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc

  react-smooth@4.0.4:
    resolution: {integrity: sha512-gnGKTpYwqL0Iii09gHobNolvX4Kiq4PKx6eWBCYYix+8cdw+cGo3do906l1NBPKkSWx1DghC1dlWG9L2uGd61Q==}
    peerDependencies:
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0
      react-dom: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0

  react-style-singleton@2.2.3:
    resolution: {integrity: sha512-b6jSvxvVnyptAiLjbkWLE/lOnR4lfTtDAl+eUC7RZy+QQWc6wRzIV2CE6xBuMmDxc2qIihtDCZD5NPOFl7fRBQ==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  react-transition-group@4.4.5:
    resolution: {integrity: sha512-pZcd1MCJoiKiBR2NRxeCRg13uCXbydPnmB4EOeRrY7480qNWO8IIgQG6zlDkm6uRMsURXPuKq0GWtiM59a5Q6g==}
    peerDependencies:
      react: '>=16.6.0'
      react-dom: '>=16.6.0'

  react@19.2.1:
    resolution: {integrity: sha512-DGrYcCWK7tvYMnWh79yrPHt+vdx9tY+1gPZa7nJQtO/p8bLTDaHp4dzwEhQB7pZ4Xe3ok4XKuEPrVuc+wlpkmw==}
    engines: {node: '>=0.10.0'}

  readable-stream@2.3.8:
    resolution: {integrity: sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==}

  recharts-scale@0.4.5:
    resolution: {integrity: sha512-kivNFO+0OcUNu7jQquLXAxz1FIwZj8nrj+YkOKc5694NbjCvcT6aSZiIzNzd2Kul4o4rTto8QVR9lMNtxD4G1w==}

  recharts@2.15.4:
    resolution: {integrity: sha512-UT/q6fwS3c1dHbXv2uFgYJ9BMFHu3fwnd7AYZaEQhXuYQ4hgsxLvsUXzGdKeZrW5xopzDCvuA2N41WJ88I7zIw==}
    engines: {node: '>=14'}
    deprecated: 1.x and 2.x branches are no longer active. Bump to Recharts v3 to receive latest features and bugfixes. See https://github.com/recharts/recharts/wiki/3.0-migration-guide
    peerDependencies:
      react: ^16.0.0 || ^17.0.0 || ^18.0.0 || ^19.0.0
      react-dom: ^16.0.0 || ^17.0.0 || ^18.0.0 || ^19.0.0

  regex-recursion@6.0.2:
    resolution: {integrity: sha512-0YCaSCq2VRIebiaUviZNs0cBz1kg5kVS2UKUfNIx8YVs1cN3AV7NTctO5FOKBA+UT2BPJIWZauYHPqJODG50cg==}

  regex-utilities@2.3.0:
    resolution: {integrity: sha512-8VhliFJAWRaUiVvREIiW2NXXTmHs4vMNnSzuJVhscgmGav3g9VDxLrQndI3dZZVVdp0ZO/5v0xmX516/7M9cng==}

  regex@6.0.1:
    resolution: {integrity: sha512-uorlqlzAKjKQZ5P+kTJr3eeJGSVroLKoHmquUj4zHWuR+hEyNqlXsSKlYYF5F4NI6nl7tWCs0apKJ0lmfsXAPA==}

  regexparam@3.0.0:
    resolution: {integrity: sha512-RSYAtP31mvYLkAHrOlh25pCNQ5hWnT106VukGaaFfuJrZFkGRX5GhUAdPqpSDXxOhA2c4akmRuplv1mRqnBn6Q==}
    engines: {node: '>=8'}

  rehype-harden@1.1.5:
    resolution: {integrity: sha512-JrtBj5BVd/5vf3H3/blyJatXJbzQfRT9pJBmjafbTaPouQCAKxHwRyCc7dle9BXQKxv4z1OzZylz/tNamoiG3A==}

  rehype-katex@7.0.1:
    resolution: {integrity: sha512-OiM2wrZ/wuhKkigASodFoo8wimG3H12LWQaH8qSPVJn9apWKFSH3YOCtbKpBorTVw/eI7cuT21XBbvwEswbIOA==}

  rehype-raw@7.0.0:
    resolution: {integrity: sha512-/aE8hCfKlQeA8LmyeyQvQF3eBiLRGNlfBJEvWH7ivp9sBqs7TNqBL5X3v157rM4IFETqDnIOO+z5M/biZbo9Ww==}

  remark-gfm@4.0.1:
    resolution: {integrity: sha512-1quofZ2RQ9EWdeN34S79+KExV1764+wCUGop5CPL1WGdD0ocPpu91lzPGbwWMECpEpd42kJGQwzRfyov9j4yNg==}

  remark-math@6.0.0:
    resolution: {integrity: sha512-MMqgnP74Igy+S3WwnhQ7kqGlEerTETXMvJhrUzDikVZ2/uogJCb+WHUg97hK9/jcfc0dkD73s3LN8zU49cTEtA==}

  remark-parse@11.0.0:
    resolution: {integrity: sha512-FCxlKLNGknS5ba/1lmpYijMUzX2esxW5xQqjWxw2eHFfS2MSdaHVINFmhjo+qN1WhZhNimq0dZATN9pH0IDrpA==}

  remark-rehype@11.1.2:
    resolution: {integrity: sha512-Dh7l57ianaEoIpzbp0PC9UKAdCSVklD8E5Rpw7ETfbTl3FqcOOgq5q2LVDhgGCkaBv7p24JXikPdvhhmHvKMsw==}

  remark-stringify@11.0.0:
    resolution: {integrity: sha512-1OSmLd3awB/t8qdoEOMazZkNsfVTeY4fTsgzcQFdXNq8ToTN4ZGwrMnlda4K6smTFKD+GRV6O48i6Z4iKgPPpw==}

  resolve-pkg-maps@1.0.0:
    resolution: {integrity: sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==}

  robust-predicates@3.0.2:
    resolution: {integrity: sha512-IXgzBWvWQwE6PrDI05OvmXUIruQTcoMDzRsOd5CDvHCVLcLHMTSYvOK5Cm46kWqlV3yAbuSpBZdJ5oP5OUoStg==}

  rollup@4.52.4:
    resolution: {integrity: sha512-CLEVl+MnPAiKh5pl4dEWSyMTpuflgNQiLGhMv8ezD5W/qP8AKvmYpCOKRRNOh7oRKnauBZ4SyeYkMS+1VSyKwQ==}
    engines: {node: '>=18.0.0', npm: '>=8.0.0'}
    hasBin: true

  roughjs@4.6.6:
    resolution: {integrity: sha512-ZUz/69+SYpFN/g/lUlo2FXcIjRkSu3nDarreVdGGndHEBJ6cXPdKguS8JGxwj5HA5xIbVKSmLgr5b3AWxtRfvQ==}

  rw@1.3.3:
    resolution: {integrity: sha512-PdhdWy89SiZogBLaw42zdeqtRJ//zFd2PgQavcICDUgJT5oW10QCRKbJ6bg4r0/UY2M6BWd5tkxuGFRvCkgfHQ==}

  safe-buffer@5.1.2:
    resolution: {integrity: sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==}

  safe-buffer@5.2.1:
    resolution: {integrity: sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==}

  safer-buffer@2.1.2:
    resolution: {integrity: sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==}

  scheduler@0.27.0:
    resolution: {integrity: sha512-eNv+WrVbKu1f3vbYJT/xtiF5syA5HPIMtf9IgY/nKg0sWqzAUEvqY/xm7OcZc/qafLx/iO9FgOmeSAp4v5ti/Q==}

  semver@6.3.1:
    resolution: {integrity: sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==}
    hasBin: true

  semver@7.8.5:
    resolution: {integrity: sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==}
    engines: {node: '>=10'}
    hasBin: true

  send@0.19.0:
    resolution: {integrity: sha512-dW41u5VfLXu8SJh5bwRmyYUbAoSB3c9uQh6L8h/KtsFREPWpbX1lrljJo186Jc4nmci/sGUZ9a0a0J2zgfq2hw==}
    engines: {node: '>= 0.8.0'}

  serve-static@1.16.2:
    resolution: {integrity: sha512-VqpjJZKadQB/PEbEwvFdO43Ax5dFBZ2UECszz8bQ7pi7wt//PWe1P6MN7eCnjsatYtBT6EuiClbjSWP2WrIoTw==}
    engines: {node: '>= 0.8.0'}

  setimmediate@1.0.5:
    resolution: {integrity: sha512-MATJdZp8sLqDl/68LfQmbP8zKPLQNV6BIZoIgrscFDQ+RsvK/BxeDQOgyxKKoh0y/8h3BqVFnCqQ/gd+reiIXA==}

  setprototypeof@1.2.0:
    resolution: {integrity: sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==}

  sharp@0.35.3:
    resolution: {integrity: sha512-ej0zVHuZGHCiABXcNxeYhpRnPNPAcvbG8RMdBAhDAxLKkCRVSpK3Iyu7qbqw3JMzoj0REeM6f3tJLtVwl0023Q==}
    engines: {node: '>=20.9.0'}
    peerDependencies:
      '@types/node': '*'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  shiki@3.14.0:
    resolution: {integrity: sha512-J0yvpLI7LSig3Z3acIuDLouV5UCKQqu8qOArwMx+/yPVC3WRMgrP67beaG8F+j4xfEWE0eVC4GeBCIXeOPra1g==}

  side-channel-list@1.0.0:
    resolution: {integrity: sha512-FCLHtRD/gnpCiCHEiJLOwdmFP+wzCmDEkc9y7NsYxeF4u7Btsn1ZuwgwJGxImImHicJArLP4R0yX4c2KCrMrTA==}
    engines: {node: '>= 0.4'}

  side-channel-map@1.0.1:
    resolution: {integrity: sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==}
    engines: {node: '>= 0.4'}

  side-channel-weakmap@1.0.2:
    resolution: {integrity: sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==}
    engines: {node: '>= 0.4'}

  side-channel@1.1.0:
    resolution: {integrity: sha512-ZX99e6tRweoUXqR+VBrslhda51Nh5MTQwou5tnUDgbtyM0dBgmhEDtWGP/xbKn6hqfPRHujUNwz5fy/wbbhnpw==}
    engines: {node: '>= 0.4'}

  siginfo@2.0.0:
    resolution: {integrity: sha512-ybx0WO1/8bSBLEWXZvEd7gMW3Sn3JFlW3TvX1nREbDLRNQNaeNN8WK0meBwPdAaOI7TtRRRJn/Es1zhrrCHu7g==}

  sonner@2.0.7:
    resolution: {integrity: sha512-W6ZN4p58k8aDKA4XPcx2hpIQXBRAgyiWVkYhT7CvK6D3iAu7xjvVyhQHg2/iaKJZ1XVJ4r7XuwGL+WGEK37i9w==}
    peerDependencies:
      react: ^18.0.0 || ^19.0.0 || ^19.0.0-rc
      react-dom: ^18.0.0 || ^19.0.0 || ^19.0.0-rc

  source-map-js@1.2.1:
    resolution: {integrity: sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==}
    engines: {node: '>=0.10.0'}

  source-map-support@0.5.21:
    resolution: {integrity: sha512-uBHU3L3czsIyYXKX88fdrGovxdSCoTGDRZ6SYXtSRxLZUzHg5P/66Ht6uoUlHu9EZod+inXhKo3qQgwXUT/y1w==}

  source-map@0.6.1:
    resolution: {integrity: sha512-UjgapumWlbMhkBgzT7Ykc5YXUT46F0iKu8SGXq0bcwP5dz/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g==}
    engines: {node: '>=0.10.0'}

  space-separated-tokens@2.0.2:
    resolution: {integrity: sha512-PEGlAwrG8yXGXRjW32fGbg66JAlOAwbObuqVoJpv/mRgoWDQfgH1wDPvtzWyUSNAXBGSk8h755YDbbcEy3SH2Q==}

  sql-escaper@1.5.1:
    resolution: {integrity: sha512-4toX5E1fQbBrpfXidaHnF0669nkAdETeIPTs2SUjxxD7RRIs9ICG4gtpmfc68JCEKehsdwLFqBu9VlQqZ1P1gg==}
    engines: {bun: '>=1.0.0', deno: '>=2.0.0', node: '>=12.0.0'}

  stackback@0.0.2:
    resolution: {integrity: sha512-1XMJE5fQo1jGH6Y/7ebnwPOBEkIEnT4QF32d5R1+VXdXveM0IBMJt8zfaxX1P3QhVwrYe+576+jkANtSS2mBbw==}

  statuses@2.0.1:
    resolution: {integrity: sha512-RwNA9Z/7PrK06rYLIzFMlaF+l73iwpzsqRIFgbMLbTcLD6cOao82TaWefPXQvB2fOC4AjuYSEndS7N/mTCbkdQ==}
    engines: {node: '>= 0.8'}

  std-env@3.9.0:
    resolution: {integrity: sha512-UGvjygr6F6tpH7o2qyqR6QYpwraIjKSdtzyBdyytFOHmPZY917kwdwLG0RbOjWOnKmnm3PeHjaoLLMie7kPLQw==}

  streamdown@1.4.0:
    resolution: {integrity: sha512-ylhDSQ4HpK5/nAH9v7OgIIdGJxlJB2HoYrYkJNGrO8lMpnWuKUcrz/A8xAMwA6eILA27469vIavcOTjmxctrKg==}
    peerDependencies:
      react: ^18.0.0 || ^19.0.0

  string_decoder@1.1.1:
    resolution: {integrity: sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==}

  stringify-entities@4.0.4:
    resolution: {integrity: sha512-IwfBptatlO+QCJUo19AqvrPNqlVMpW9YEL2LIVY+Rpv2qsjCGxaDLNRgeGsQWJhfItebuJhsGSLjaBbNSQ+ieg==}

  style-to-js@1.1.18:
    resolution: {integrity: sha512-JFPn62D4kJaPTnhFUI244MThx+FEGbi+9dw1b9yBBQ+1CZpV7QAT8kUtJ7b7EUNdHajjF/0x8fT+16oLJoojLg==}

  style-to-object@1.0.11:
    resolution: {integrity: sha512-5A560JmXr7wDyGLK12Nq/EYS38VkGlglVzkis1JEdbGWSnbQIEhZzTJhzURXN5/8WwwFCs/f/VVcmkTppbXLow==}

  stylis@4.3.6:
    resolution: {integrity: sha512-yQ3rwFWRfwNUY7H5vpU0wfdkNSnvnJinhF9830Swlaxl03zsOjCfmX0ugac+3LtK0lYSgwL/KXc8oYL3mG4YFQ==}

  superjson@1.13.3:
    resolution: {integrity: sha512-mJiVjfd2vokfDxsQPOwJ/PtanO87LhpYY88ubI5dUB1Ab58Txbyje3+jpm+/83R/fevaq/107NNhtYBLuoTrFg==}
    engines: {node: '>=10'}

  tailwind-merge@3.3.1:
    resolution: {integrity: sha512-gBXpgUm/3rp1lMZZrM/w7D8GKqshif0zAymAhbCyIt8KMe+0v9DQ7cdYLR4FHH/cKpdTXb+A/tKKU3eolfsI+g==}

  tailwindcss-animate@1.0.7:
    resolution: {integrity: sha512-bl6mpH3T7I3UFxuvDEXLxy/VuFxBk5bbzplh7tXI68mwMokNYd1t9qPBHlnyTwfa4JGC4zP516I1hYYtQ/vspA==}
    peerDependencies:
      tailwindcss: '>=3.0.0 || insiders'

  tailwindcss@4.1.14:
    resolution: {integrity: sha512-b7pCxjGO98LnxVkKjaZSDeNuljC4ueKUddjENJOADtubtdo8llTaJy7HwBMeLNSSo2N5QIAgklslK1+Ir8r6CA==}

  tapable@2.3.0:
    resolution: {integrity: sha512-g9ljZiwki/LfxmQADO3dEY1CbpmXT5Hm2fJ+QaGKwSXUylMybePR7/67YW7jOrrvjEgL1Fmz5kzyAjWVWLlucg==}
    engines: {node: '>=6'}

  tar@7.5.1:
    resolution: {integrity: sha512-nlGpxf+hv0v7GkWBK2V9spgactGOp0qvfWRxUMjqHyzrt3SgwE48DIv/FhqPHJYLHpgW1opq3nERbz5Anq7n1g==}
    engines: {node: '>=18'}
    deprecated: Old versions of tar are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me

  tiny-invariant@1.3.3:
    resolution: {integrity: sha512-+FbBPE1o9QAYvviau/qC5SE3caw21q3xkvWKBtja5vgqOWIHHJ3ioaq1VPfn/Szqctz2bU/oYeKd9/z5BL+PVg==}

  tinybench@2.9.0:
    resolution: {integrity: sha512-0+DUvqWMValLmha6lr4kD8iAMK1HzV0/aKnCtWb9v9641TnP/MFb7Pc2bxoxQjTXAErryXVgUOfv2YqNllqGeg==}

  tinyexec@0.3.2:
    resolution: {integrity: sha512-KQQR9yN7R5+OSwaK0XQoj22pwHoTlgYqmUscPYoknOoWCWfj/5/ABTMRi69FrKU5ffPVh5QcFikpWJI/P1ocHA==}

  tinyexec@1.0.1:
    resolution: {integrity: sha512-5uC6DDlmeqiOwCPmK9jMSdOuZTh8bU39Ys6yidB+UTt5hfZUPGAypSgFRiEp+jbi9qH40BLDvy85jIU88wKSqw==}

  tinyglobby@0.2.15:
    resolution: {integrity: sha512-j2Zq4NyQYG5XMST4cbs02Ak8iJUdxRM0XI5QyxXuZOzKOINmWurp3smXu3y5wDcJrptwpSjgXHzIQxR0omXljQ==}
    engines: {node: '>=12.0.0'}

  tinypool@1.1.1:
    resolution: {integrity: sha512-Zba82s87IFq9A9XmjiX5uZA/ARWDrB03OHlq+Vw1fSdt0I+4/Kutwy8BP4Y/y/aORMo61FQ0vIb5j44vSo5Pkg==}
    engines: {node: ^18.0.0 || >=20.0.0}

  tinyrainbow@1.2.0:
    resolution: {integrity: sha512-weEDEq7Z5eTHPDh4xjX789+fHfF+P8boiFB+0vbWzpbnbsEr/GRaohi/uMKxg8RZMXnl1ItAi/IUHWMsjDV7kQ==}
    engines: {node: '>=14.0.0'}

  tinyspy@3.0.2:
    resolution: {integrity: sha512-n1cw8k1k0x4pgA2+9XrOkFydTerNcJ1zWCO5Nn9scWHTD+5tp8dghT2x1uduQePZTZgd3Tupf+x9BxJjeJi77Q==}
    engines: {node: '>=14.0.0'}

  toidentifier@1.0.1:
    resolution: {integrity: sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==}
    engines: {node: '>=0.6'}

  trim-lines@3.0.1:
    resolution: {integrity: sha512-kRj8B+YHZCc9kQYdWfJB2/oUl9rA99qbowYYBtr4ui4mZyAQ2JpvVBd/6U2YloATfqBhBTSMhTpgBHtU0Mf3Rg==}

  trough@2.2.0:
    resolution: {integrity: sha512-tmMpK00BjZiUyVyvrBK7knerNgmgvcV/KLVyuma/SC+TQN167GrMRciANTz09+k3zW8L8t60jWO1GpfkZdjTaw==}

  ts-dedent@2.2.0:
    resolution: {integrity: sha512-q5W7tVM71e2xjHZTlgfTDoPF/SmqKG5hddq9SzR49CH2hayqRKJtQ4mtRlSxKaJlR/+9rEM+mnBHf7I2/BQcpQ==}
    engines: {node: '>=6.10'}

  tslib@2.8.1:
    resolution: {integrity: sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==}

  tsx@4.20.6:
    resolution: {integrity: sha512-ytQKuwgmrrkDTFP4LjR0ToE2nqgy886GpvRSpU0JAnrdBYppuY5rLkRUYPU1yCryb24SsKBTL/hlDQAEFVwtZg==}
    engines: {node: '>=18.0.0'}
    hasBin: true

  tsx@4.23.12:
    resolution: {integrity: sha512-FDf4L4sYzKtzWYhU/Xm0AQFdTjdIxNo9ElTf2mxXM6k8YMHXzYUe4yODVaXP4V9uMFbVg8c0qyBccK2OOxb45Q==}
    engines: {node: '>=18.0.0'}
    hasBin: true

  tw-animate-css@1.4.0:
    resolution: {integrity: sha512-7bziOlRqH0hJx80h/3mbicLW7o8qLsH5+RaLR2t+OHM3D0JlWGODQKQ4cxbK7WlvmUxpcj6Kgu6EKqjrGFe3QQ==}

  type-is@1.6.18:
    resolution: {integrity: sha512-TkRKr9sUTxEH8MdfuCSP7VizJyzRNMjj2J2do2Jr3Kym598JVdEksuzPQCnlFPW4ky9Q+iA+ma9BGm06XQBy8g==}
    engines: {node: '>= 0.6'}

  typescript@5.9.3:
    resolution: {integrity: sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==}
    engines: {node: '>=14.17'}
    hasBin: true

  ufo@1.6.1:
    resolution: {integrity: sha512-9a4/uxlTWJ4+a5i0ooc1rU7C7YOw3wT+UGqdeNNHWnOF9qcMBgLRS+4IYUqbczewFx4mLEig6gawh7X6mFlEkA==}

  undici-types@7.14.0:
    resolution: {integrity: sha512-QQiYxHuyZ9gQUIrmPo3IA+hUl4KYk8uSA7cHrcKd/l3p1OTpZcM0Tbp9x7FAtXdAYhlasd60ncPpgu6ihG6TOA==}

  unified@11.0.5:
    resolution: {integrity: sha512-xKvGhPWw3k84Qjh8bI3ZeJjqnyadK+GEFtazSfZv/rKeTkTjOJho6mFqh2SM96iIcZokxiOpg78GazTSg8+KHA==}

  unist-util-find-after@5.0.0:
    resolution: {integrity: sha512-amQa0Ep2m6hE2g72AugUItjbuM8X8cGQnFoHk0pGfrFeT9GZhzN5SW8nRsiGKK7Aif4CrACPENkA6P/Lw6fHGQ==}

  unist-util-is@6.0.1:
    resolution: {integrity: sha512-LsiILbtBETkDz8I9p1dQ0uyRUWuaQzd/cuEeS1hoRSyW5E5XGmTzlwY1OrNzzakGowI9Dr/I8HVaw4hTtnxy8g==}

  unist-util-position@5.0.0:
    resolution: {integrity: sha512-fucsC7HjXvkB5R3kTCO7kUjRdrS0BJt3M/FPxmHMBOm8JQi2BsHAHFsy27E0EolP8rp0NzXsJ+jNPyDWvOJZPA==}

  unist-util-remove-position@5.0.0:
    resolution: {integrity: sha512-Hp5Kh3wLxv0PHj9m2yZhhLt58KzPtEYKQQ4yxfYFEO7EvHwzyDYnduhHnY1mDxoqr7VUwVuHXk9RXKIiYS1N8Q==}

  unist-util-stringify-position@4.0.0:
    resolution: {integrity: sha512-0ASV06AAoKCDkS2+xw5RXJywruurpbC4JZSm7nr7MOt1ojAzvyyaO+UxZf18j8FCF6kmzCZKcAgN/yu2gm2XgQ==}

  unist-util-visit-parents@6.0.2:
    resolution: {integrity: sha512-goh1s1TBrqSqukSc8wrjwWhL0hiJxgA8m4kFxGlQ+8FYQ3C/m11FcTs4YYem7V664AhHVvgoQLk890Ssdsr2IQ==}

  unist-util-visit@5.0.0:
    resolution: {integrity: sha512-MR04uvD+07cwl/yhVuVWAtw+3GOR/knlL55Nd/wAdblk27GCVt3lqpTivy/tkJcZoNPzTwS1Y+KMojlLDhoTzg==}

  unpipe@1.0.0:
    resolution: {integrity: sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==}
    engines: {node: '>= 0.8'}

  update-browserslist-db@1.1.3:
    resolution: {integrity: sha512-UxhIZQ+QInVdunkDAaiazvvT/+fXL5Osr0JZlJulepYu6Jd7qJtDZjlur0emRlT71EN3ScPoE7gvsuIKKNavKw==}
    hasBin: true
    peerDependencies:
      browserslist: '>= 4.21.0'

  use-callback-ref@1.3.3:
    resolution: {integrity: sha512-jQL3lRnocaFtu3V00JToYz/4QkNWswxijDaCVNZRiRTO3HQDLsdu1ZtmIUvV4yPp+rvWm5j0y0TG/S61cuijTg==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  use-sidecar@1.1.3:
    resolution: {integrity: sha512-Fedw0aZvkhynoPYlA5WXrMCAMm+nSWdZt6lzJQ7Ok8S6Q+VsHmHpRWndVRJ8Be0ZbkfPc5LRYH+5XrzXcEeLRQ==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  use-sync-external-store@1.6.0:
    resolution: {integrity: sha512-Pp6GSwGP/NrPIrxVFAIkOQeyw8lFenOHijQWkUTrDvrF4ALqylP2C/KCkeS9dpUM3KvYRQhna5vt7IL95+ZQ9w==}
    peerDependencies:
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0

  util-deprecate@1.0.2:
    resolution: {integrity: sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==}

  utils-merge@1.0.1:
    resolution: {integrity: sha512-pMZTvIkT1d+TFGvDOqodOclx0QWkkgi6Tdoa8gC8ffGAAqz9pzPTZWAybbsHHoED/ztMtkv/VoYTYyShUn81hA==}
    engines: {node: '>= 0.4.0'}

  uuid@11.1.0:
    resolution: {integrity: sha512-0/A9rDy9P7cJ+8w1c9WD9V//9Wj15Ce2MPz8Ri6032usz+NfePxx5AcN3bN+r6ZL6jEo066/yNYB3tn4pQEx+A==}
    hasBin: true

  vary@1.1.2:
    resolution: {integrity: sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==}
    engines: {node: '>= 0.8'}

  vaul@1.1.2:
    resolution: {integrity: sha512-ZFkClGpWyI2WUQjdLJ/BaGuV6AVQiJ3uELGk3OYtP+B6yCO7Cmn9vPFXVJkRaGkOJu3m8bQMgtyzNHixULceQA==}
    peerDependencies:
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0.0 || ^19.0.0-rc

  vfile-location@5.0.3:
    resolution: {integrity: sha512-5yXvWDEgqeiYiBe1lbxYF7UMAIm/IcopxMHrMQDq3nvKcjPKIhZklUKL+AE7J7uApI4kwe2snsK+eI6UTj9EHg==}

  vfile-message@4.0.3:
    resolution: {integrity: sha512-QTHzsGd1EhbZs4AsQ20JX1rC3cOlt/IWJruk893DfLRr57lcnOeMaWG4K0JrRta4mIJZKth2Au3mM3u03/JWKw==}

  vfile@6.0.3:
    resolution: {integrity: sha512-KzIbH/9tXat2u30jf+smMwFCsno4wHVdNmzFyL+T/L3UGqqk6JKfVqOFOZEpZSHADH1k40ab6NUIXZq422ov3Q==}

  victory-vendor@36.9.2:
    resolution: {integrity: sha512-PnpQQMuxlwYdocC8fIJqVXvkeViHYzotI+NJrCuav0ZYFoq912ZHBk3mCeuj+5/VpodOjPe1z0Fk2ihgzlXqjQ==}

  vite-node@2.1.9:
    resolution: {integrity: sha512-AM9aQ/IPrW/6ENLQg3AGY4K1N2TGZdR5e4gu/MmmR2xR3Ll1+dib+nook92g4TV3PXVyeyxdWwtaCAiUL0hMxA==}
    engines: {node: ^18.0.0 || >=20.0.0}
    hasBin: true

  vite-plugin-manus-runtime@0.0.59:
    resolution: {integrity: sha512-rgEEON7T63R+/2SHAJ0YoKR0skSWKYuCuIZBeRcVnjSWGsZsTigXFHfjpe9/wJCJAeqPVAUhTv0D+CTlPxnCiw==}

  vite@5.4.20:
    resolution: {integrity: sha512-j3lYzGC3P+B5Yfy/pfKNgVEg4+UtcIJcVRt2cDjIOmhLourAqPqf8P7acgxeiSgUB7E3p2P8/3gNIgDLpwzs4g==}
    engines: {node: ^18.0.0 || >=20.0.0}
    hasBin: true
    peerDependencies:
      '@types/node': ^18.0.0 || >=20.0.0
      less: '*'
      lightningcss: ^1.21.0
      sass: '*'
      sass-embedded: '*'
      stylus: '*'
      sugarss: '*'
      terser: ^5.4.0
    peerDependenciesMeta:
      '@types/node':
        optional: true
      less:
        optional: true
      lightningcss:
        optional: true
      sass:
        optional: true
      sass-embedded:
        optional: true
      stylus:
        optional: true
      sugarss:
        optional: true
      terser:
        optional: true

  vite@7.1.9:
    resolution: {integrity: sha512-4nVGliEpxmhCL8DslSAUdxlB6+SMrhB0a1v5ijlh1xB1nEPuy1mxaHxysVucLHuWryAxLWg6a5ei+U4TLn/rFg==}
    engines: {node: ^20.19.0 || >=22.12.0}
    hasBin: true
    peerDependencies:
      '@types/node': ^20.19.0 || >=22.12.0
      jiti: '>=1.21.0'
      less: ^4.0.0
      lightningcss: ^1.21.0
      sass: ^1.70.0
      sass-embedded: ^1.70.0
      stylus: '>=0.54.8'
      sugarss: ^5.0.0
      terser: ^5.16.0
      tsx: ^4.8.1
      yaml: ^2.4.2
    peerDependenciesMeta:
      '@types/node':
        optional: true
      jiti:
        optional: true
      less:
        optional: true
      lightningcss:
        optional: true
      sass:
        optional: true
      sass-embedded:
        optional: true
      stylus:
        optional: true
      sugarss:
        optional: true
      terser:
        optional: true
      tsx:
        optional: true
      yaml:
        optional: true

  vitest@2.1.9:
    resolution: {integrity: sha512-MSmPM9REYqDGBI8439mA4mWhV5sKmDlBKWIYbA3lRb2PTHACE0mgKwA8yQ2xq9vxDTuk4iPrECBAEW2aoFXY0Q==}
    engines: {node: ^18.0.0 || >=20.0.0}
    hasBin: true
    peerDependencies:
      '@edge-runtime/vm': '*'
      '@types/node': ^18.0.0 || >=20.0.0
      '@vitest/browser': 2.1.9
      '@vitest/ui': 2.1.9
      happy-dom: '*'
      jsdom: '*'
    peerDependenciesMeta:
      '@edge-runtime/vm':
        optional: true
      '@types/node':
        optional: true
      '@vitest/browser':
        optional: true
      '@vitest/ui':
        optional: true
      happy-dom:
        optional: true
      jsdom:
        optional: true

  vscode-jsonrpc@8.2.0:
    resolution: {integrity: sha512-C+r0eKJUIfiDIfwJhria30+TYWPtuHJXHtI7J0YlOmKAo7ogxP20T0zxB7HZQIFhIyvoBPwWskjxrvAtfjyZfA==}
    engines: {node: '>=14.0.0'}

  vscode-languageserver-protocol@3.17.5:
    resolution: {integrity: sha512-mb1bvRJN8SVznADSGWM9u/b07H7Ecg0I3OgXDuLdn307rl/J3A9YD6/eYOssqhecL27hK1IPZAsaqh00i/Jljg==}

  vscode-languageserver-textdocument@1.0.12:
    resolution: {integrity: sha512-cxWNPesCnQCcMPeenjKKsOCKQZ/L6Tv19DTRIGuLWe32lyzWhihGVJ/rcckZXJxfdKCFvRLS3fpBIsV/ZGX4zA==}

  vscode-languageserver-types@3.17.5:
    resolution: {integrity: sha512-Ld1VelNuX9pdF39h2Hgaeb5hEZM2Z3jUrrMgWQAu82jMtZp7p3vJT3BzToKtZI7NgQssZje5o0zryOrhQvzQAg==}

  vscode-languageserver@9.0.1:
    resolution: {integrity: sha512-woByF3PDpkHFUreUa7Hos7+pUWdeWMXRd26+ZX2A8cFx6v/JPTtd4/uN0/jB6XQHYaOlHbio03NTHCqrgG5n7g==}
    hasBin: true

  vscode-uri@3.0.8:
    resolution: {integrity: sha512-AyFQ0EVmsOZOlAnxoFOGOq1SQDWAB7C6aqMGS23svWAllfOaxbuFvcT8D1i8z3Gyn8fraVeZNNmN6e9bxxXkKw==}

  web-namespaces@2.0.1:
    resolution: {integrity: sha512-bKr1DkiNa2krS7qxNtdrtHAmzuYGFQLiQ13TsorsdT6ULTkPLKuu5+GsFpDlg6JFjUTwX2DyhMPG2be8uPrqsQ==}

  why-is-node-running@2.3.0:
    resolution: {integrity: sha512-hUrmaWBdVDcxvYqnyh09zunKzROWjbZTiNy8dBEjkS7ehEDQibXJ7XvlmtbwuTclUiIyN+CyXQD4Vmko8fNm8w==}
    engines: {node: '>=8'}
    hasBin: true

  wouter@3.7.1:
    resolution: {integrity: sha512-od5LGmndSUzntZkE2R5CHhoiJ7YMuTIbiXsa0Anytc2RATekgv4sfWRAxLEULBrp7ADzinWQw8g470lkT8+fOw==}
    peerDependencies:
      react: '>=16.8.0'

  yallist@3.1.1:
    resolution: {integrity: sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==}

  yallist@5.0.0:
    resolution: {integrity: sha512-YgvUTfwqyc7UXVMrB+SImsVYSmTS8X/tSrtdNZMImM+n7+QTriRXyXim0mBrTXNeqzVF0KWGgHPeiyViFFrNDw==}
    engines: {node: '>=18'}

  zod@4.1.12:
    resolution: {integrity: sha512-JInaHOamG8pt5+Ey8kGmdcAcg3OL9reK8ltczgHTAwNhMys/6ThXHityHxVV2p3fkw/c+MAvBHFVYHFZDmjMCQ==}

  zwitch@2.0.4:
    resolution: {integrity: sha512-bXE4cR/kVZhKZX/RjPEflHaKVhUVl85noU3v6b8apfQEc1x4A+zBxjZ4lN8LqGd6WZ3dl98pY4o717VFmoPp+A==}

snapshots:

  '@antfu/install-pkg@1.1.0':
    dependencies:
      package-manager-detector: 1.5.0
      tinyexec: 1.0.1

  '@antfu/utils@9.3.0': {}

  '@aws-sdk/checksums@3.1000.28':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/client-s3@3.1114.0':
    dependencies:
      '@aws-sdk/checksums': 3.1000.28
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/credential-provider-node': 3.972.80
      '@aws-sdk/middleware-sdk-s3': 3.972.74
      '@aws-sdk/signature-v4-multi-region': 3.996.45
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/fetch-http-handler': 5.7.2
      '@smithy/node-http-handler': 4.11.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/core@3.977.8':
    dependencies:
      '@aws-sdk/types': 3.974.4
      '@aws-sdk/xml-builder': 3.972.39
      '@aws/lambda-invoke-store': 0.3.0
      '@smithy/core': 3.33.2
      '@smithy/signature-v4': 5.7.2
      '@smithy/types': 4.17.2
      bowser: 2.14.1
      tslib: 2.8.1

  '@aws-sdk/credential-provider-env@3.972.69':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/credential-provider-http@3.972.71':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/fetch-http-handler': 5.7.2
      '@smithy/node-http-handler': 4.11.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/credential-provider-ini@3.973.14':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/credential-provider-env': 3.972.69
      '@aws-sdk/credential-provider-http': 3.972.71
      '@aws-sdk/credential-provider-login': 3.972.76
      '@aws-sdk/credential-provider-process': 3.972.69
      '@aws-sdk/credential-provider-sso': 3.973.13
      '@aws-sdk/credential-provider-web-identity': 3.972.75
      '@aws-sdk/nested-clients': 3.997.43
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/credential-provider-imds': 4.5.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/credential-provider-login@3.972.76':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/nested-clients': 3.997.43
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/credential-provider-node@3.972.80':
    dependencies:
      '@aws-sdk/credential-provider-env': 3.972.69
      '@aws-sdk/credential-provider-http': 3.972.71
      '@aws-sdk/credential-provider-ini': 3.973.14
      '@aws-sdk/credential-provider-process': 3.972.69
      '@aws-sdk/credential-provider-sso': 3.973.13
      '@aws-sdk/credential-provider-web-identity': 3.972.75
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/credential-provider-imds': 4.5.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/credential-provider-process@3.972.69':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/credential-provider-sso@3.973.13':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/nested-clients': 3.997.43
      '@aws-sdk/token-providers': 3.1111.0
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/credential-provider-web-identity@3.972.75':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/nested-clients': 3.997.43
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/middleware-sdk-s3@3.972.74':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/signature-v4-multi-region': 3.996.45
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/nested-clients@3.997.43':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/signature-v4-multi-region': 3.996.45
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/fetch-http-handler': 5.7.2
      '@smithy/node-http-handler': 4.11.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/s3-request-presigner@3.1114.0':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/signature-v4-multi-region': 3.996.45
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/signature-v4-multi-region@3.996.45':
    dependencies:
      '@aws-sdk/types': 3.974.4
      '@smithy/signature-v4': 5.7.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/token-providers@3.1111.0':
    dependencies:
      '@aws-sdk/core': 3.977.8
      '@aws-sdk/nested-clients': 3.997.43
      '@aws-sdk/types': 3.974.4
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/types@3.974.4':
    dependencies:
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws-sdk/xml-builder@3.972.39':
    dependencies:
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@aws/lambda-invoke-store@0.3.0': {}

  '@babel/code-frame@7.27.1':
    dependencies:
      '@babel/helper-validator-identifier': 7.27.1
      js-tokens: 4.0.0
      picocolors: 1.1.1

  '@babel/compat-data@7.28.4': {}

  '@babel/core@7.28.4':
    dependencies:
      '@babel/code-frame': 7.27.1
      '@babel/generator': 7.28.3
      '@babel/helper-compilation-targets': 7.27.2
      '@babel/helper-module-transforms': 7.28.3(@babel/core@7.28.4)
      '@babel/helpers': 7.28.4
      '@babel/parser': 7.28.4
      '@babel/template': 7.27.2
      '@babel/traverse': 7.28.4
      '@babel/types': 7.28.4
      '@jridgewell/remapping': 2.3.5
      convert-source-map: 2.0.0
      debug: 4.4.3
      gensync: 1.0.0-beta.2
      json5: 2.2.3
      semver: 6.3.1
    transitivePeerDependencies:
      - supports-color

  '@babel/generator@7.28.3':
    dependencies:
      '@babel/parser': 7.28.4
      '@babel/types': 7.28.4
      '@jridgewell/gen-mapping': 0.3.13
      '@jridgewell/trace-mapping': 0.3.31
      jsesc: 3.1.0

  '@babel/helper-compilation-targets@7.27.2':
    dependencies:
      '@babel/compat-data': 7.28.4
      '@babel/helper-validator-option': 7.27.1
      browserslist: 4.26.3
      lru-cache: 5.1.1
      semver: 6.3.1

  '@babel/helper-globals@7.28.0': {}

  '@babel/helper-module-imports@7.27.1':
    dependencies:
      '@babel/traverse': 7.28.4
      '@babel/types': 7.28.4
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-module-transforms@7.28.3(@babel/core@7.28.4)':
    dependencies:
      '@babel/core': 7.28.4
      '@babel/helper-module-imports': 7.27.1
      '@babel/helper-validator-identifier': 7.27.1
      '@babel/traverse': 7.28.4
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-plugin-utils@7.27.1': {}

  '@babel/helper-string-parser@7.27.1': {}

  '@babel/helper-validator-identifier@7.27.1': {}

  '@babel/helper-validator-option@7.27.1': {}

  '@babel/helpers@7.28.4':
    dependencies:
      '@babel/template': 7.27.2
      '@babel/types': 7.28.4

  '@babel/parser@7.28.4':
    dependencies:
      '@babel/types': 7.28.4

  '@babel/plugin-transform-react-jsx-self@7.27.1(@babel/core@7.28.4)':
    dependencies:
      '@babel/core': 7.28.4
      '@babel/helper-plugin-utils': 7.27.1

  '@babel/plugin-transform-react-jsx-source@7.27.1(@babel/core@7.28.4)':
    dependencies:
      '@babel/core': 7.28.4
      '@babel/helper-plugin-utils': 7.27.1

  '@babel/runtime@7.28.4': {}

  '@babel/template@7.27.2':
    dependencies:
      '@babel/code-frame': 7.27.1
      '@babel/parser': 7.28.4
      '@babel/types': 7.28.4

  '@babel/traverse@7.28.4':
    dependencies:
      '@babel/code-frame': 7.27.1
      '@babel/generator': 7.28.3
      '@babel/helper-globals': 7.28.0
      '@babel/parser': 7.28.4
      '@babel/template': 7.27.2
      '@babel/types': 7.28.4
      debug: 4.4.3
    transitivePeerDependencies:
      - supports-color

  '@babel/types@7.28.4':
    dependencies:
      '@babel/helper-string-parser': 7.27.1
      '@babel/helper-validator-identifier': 7.27.1

  '@braintree/sanitize-url@7.1.1': {}

  '@builder.io/jsx-loc-internals@0.0.1':
    dependencies:
      '@babel/parser': 7.28.4
      estree-walker: 2.0.2
      magic-string: 0.30.19

  '@builder.io/vite-plugin-jsx-loc@0.1.1(vite@7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6))':
    dependencies:
      '@builder.io/jsx-loc-internals': 0.0.1
      vite: 7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6)

  '@chevrotain/cst-dts-gen@11.0.3':
    dependencies:
      '@chevrotain/gast': 11.0.3
      '@chevrotain/types': 11.0.3
      lodash-es: 4.17.21

  '@chevrotain/gast@11.0.3':
    dependencies:
      '@chevrotain/types': 11.0.3
      lodash-es: 4.17.21

  '@chevrotain/regexp-to-ast@11.0.3': {}

  '@chevrotain/types@11.0.3': {}

  '@chevrotain/utils@11.0.3': {}

  '@date-fns/tz@1.4.1': {}

  '@drizzle-team/brocli@0.10.2': {}

  '@emnapi/runtime@1.11.3':
    dependencies:
      tslib: 2.8.1
    optional: true

  '@esbuild-kit/core-utils@3.3.2':
    dependencies:
      esbuild: 0.18.20
      source-map-support: 0.5.21

  '@esbuild-kit/esm-loader@2.6.5':
    dependencies:
      '@esbuild-kit/core-utils': 3.3.2
      get-tsconfig: 4.12.0

  '@esbuild/aix-ppc64@0.21.5':
    optional: true

  '@esbuild/aix-ppc64@0.25.10':
    optional: true

  '@esbuild/aix-ppc64@0.28.2':
    optional: true

  '@esbuild/android-arm64@0.18.20':
    optional: true

  '@esbuild/android-arm64@0.21.5':
    optional: true

  '@esbuild/android-arm64@0.25.10':
    optional: true

  '@esbuild/android-arm64@0.28.2':
    optional: true

  '@esbuild/android-arm@0.18.20':
    optional: true

  '@esbuild/android-arm@0.21.5':
    optional: true

  '@esbuild/android-arm@0.25.10':
    optional: true

  '@esbuild/android-arm@0.28.2':
    optional: true

  '@esbuild/android-x64@0.18.20':
    optional: true

  '@esbuild/android-x64@0.21.5':
    optional: true

  '@esbuild/android-x64@0.25.10':
    optional: true

  '@esbuild/android-x64@0.28.2':
    optional: true

  '@esbuild/darwin-arm64@0.18.20':
    optional: true

  '@esbuild/darwin-arm64@0.21.5':
    optional: true

  '@esbuild/darwin-arm64@0.25.10':
    optional: true

  '@esbuild/darwin-arm64@0.28.2':
    optional: true

  '@esbuild/darwin-x64@0.18.20':
    optional: true

  '@esbuild/darwin-x64@0.21.5':
    optional: true

  '@esbuild/darwin-x64@0.25.10':
    optional: true

  '@esbuild/darwin-x64@0.28.2':
    optional: true

  '@esbuild/freebsd-arm64@0.18.20':
    optional: true

  '@esbuild/freebsd-arm64@0.21.5':
    optional: true

  '@esbuild/freebsd-arm64@0.25.10':
    optional: true

  '@esbuild/freebsd-arm64@0.28.2':
    optional: true

  '@esbuild/freebsd-x64@0.18.20':
    optional: true

  '@esbuild/freebsd-x64@0.21.5':
    optional: true

  '@esbuild/freebsd-x64@0.25.10':
    optional: true

  '@esbuild/freebsd-x64@0.28.2':
    optional: true

  '@esbuild/linux-arm64@0.18.20':
    optional: true

  '@esbuild/linux-arm64@0.21.5':
    optional: true

  '@esbuild/linux-arm64@0.25.10':
    optional: true

  '@esbuild/linux-arm64@0.28.2':
    optional: true

  '@esbuild/linux-arm@0.18.20':
    optional: true

  '@esbuild/linux-arm@0.21.5':
    optional: true

  '@esbuild/linux-arm@0.25.10':
    optional: true

  '@esbuild/linux-arm@0.28.2':
    optional: true

  '@esbuild/linux-ia32@0.18.20':
    optional: true

  '@esbuild/linux-ia32@0.21.5':
    optional: true

  '@esbuild/linux-ia32@0.25.10':
    optional: true

  '@esbuild/linux-ia32@0.28.2':
    optional: true

  '@esbuild/linux-loong64@0.18.20':
    optional: true

  '@esbuild/linux-loong64@0.21.5':
    optional: true

  '@esbuild/linux-loong64@0.25.10':
    optional: true

  '@esbuild/linux-loong64@0.28.2':
    optional: true

  '@esbuild/linux-mips64el@0.18.20':
    optional: true

  '@esbuild/linux-mips64el@0.21.5':
    optional: true

  '@esbuild/linux-mips64el@0.25.10':
    optional: true

  '@esbuild/linux-mips64el@0.28.2':
    optional: true

  '@esbuild/linux-ppc64@0.18.20':
    optional: true

  '@esbuild/linux-ppc64@0.21.5':
    optional: true

  '@esbuild/linux-ppc64@0.25.10':
    optional: true

  '@esbuild/linux-ppc64@0.28.2':
    optional: true

  '@esbuild/linux-riscv64@0.18.20':
    optional: true

  '@esbuild/linux-riscv64@0.21.5':
    optional: true

  '@esbuild/linux-riscv64@0.25.10':
    optional: true

  '@esbuild/linux-riscv64@0.28.2':
    optional: true

  '@esbuild/linux-s390x@0.18.20':
    optional: true

  '@esbuild/linux-s390x@0.21.5':
    optional: true

  '@esbuild/linux-s390x@0.25.10':
    optional: true

  '@esbuild/linux-s390x@0.28.2':
    optional: true

  '@esbuild/linux-x64@0.18.20':
    optional: true

  '@esbuild/linux-x64@0.21.5':
    optional: true

  '@esbuild/linux-x64@0.25.10':
    optional: true

  '@esbuild/linux-x64@0.28.2':
    optional: true

  '@esbuild/netbsd-arm64@0.25.10':
    optional: true

  '@esbuild/netbsd-arm64@0.28.2':
    optional: true

  '@esbuild/netbsd-x64@0.18.20':
    optional: true

  '@esbuild/netbsd-x64@0.21.5':
    optional: true

  '@esbuild/netbsd-x64@0.25.10':
    optional: true

  '@esbuild/netbsd-x64@0.28.2':
    optional: true

  '@esbuild/openbsd-arm64@0.25.10':
    optional: true

  '@esbuild/openbsd-arm64@0.28.2':
    optional: true

  '@esbuild/openbsd-x64@0.18.20':
    optional: true

  '@esbuild/openbsd-x64@0.21.5':
    optional: true

  '@esbuild/openbsd-x64@0.25.10':
    optional: true

  '@esbuild/openbsd-x64@0.28.2':
    optional: true

  '@esbuild/openharmony-arm64@0.25.10':
    optional: true

  '@esbuild/openharmony-arm64@0.28.2':
    optional: true

  '@esbuild/sunos-x64@0.18.20':
    optional: true

  '@esbuild/sunos-x64@0.21.5':
    optional: true

  '@esbuild/sunos-x64@0.25.10':
    optional: true

  '@esbuild/sunos-x64@0.28.2':
    optional: true

  '@esbuild/win32-arm64@0.18.20':
    optional: true

  '@esbuild/win32-arm64@0.21.5':
    optional: true

  '@esbuild/win32-arm64@0.25.10':
    optional: true

  '@esbuild/win32-arm64@0.28.2':
    optional: true

  '@esbuild/win32-ia32@0.18.20':
    optional: true

  '@esbuild/win32-ia32@0.21.5':
    optional: true

  '@esbuild/win32-ia32@0.25.10':
    optional: true

  '@esbuild/win32-ia32@0.28.2':
    optional: true

  '@esbuild/win32-x64@0.18.20':
    optional: true

  '@esbuild/win32-x64@0.21.5':
    optional: true

  '@esbuild/win32-x64@0.25.10':
    optional: true

  '@esbuild/win32-x64@0.28.2':
    optional: true

  '@floating-ui/core@1.7.3':
    dependencies:
      '@floating-ui/utils': 0.2.10

  '@floating-ui/dom@1.7.4':
    dependencies:
      '@floating-ui/core': 1.7.3
      '@floating-ui/utils': 0.2.10

  '@floating-ui/react-dom@2.1.6(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@floating-ui/dom': 1.7.4
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)

  '@floating-ui/utils@0.2.10': {}

  '@hookform/resolvers@5.2.2(react-hook-form@7.64.0(react@19.2.1))':
    dependencies:
      '@standard-schema/utils': 0.3.0
      react-hook-form: 7.64.0(react@19.2.1)

  '@iconify/types@2.0.0': {}

  '@iconify/utils@3.0.2':
    dependencies:
      '@antfu/install-pkg': 1.1.0
      '@antfu/utils': 9.3.0
      '@iconify/types': 2.0.0
      debug: 4.4.3
      globals: 15.15.0
      kolorist: 1.8.0
      local-pkg: 1.1.2
      mlly: 1.8.0
    transitivePeerDependencies:
      - supports-color

  '@img/colour@1.1.0': {}

  '@img/sharp-darwin-arm64@0.35.3':
    optionalDependencies:
      '@img/sharp-libvips-darwin-arm64': 1.3.2
    optional: true

  '@img/sharp-darwin-x64@0.35.3':
    optionalDependencies:
      '@img/sharp-libvips-darwin-x64': 1.3.2
    optional: true

  '@img/sharp-freebsd-wasm32@0.35.3':
    dependencies:
      '@img/sharp-wasm32': 0.35.3
    optional: true

  '@img/sharp-libvips-darwin-arm64@1.3.2':
    optional: true

  '@img/sharp-libvips-darwin-x64@1.3.2':
    optional: true

  '@img/sharp-libvips-linux-arm64@1.3.2':
    optional: true

  '@img/sharp-libvips-linux-arm@1.3.2':
    optional: true

  '@img/sharp-libvips-linux-ppc64@1.3.2':
    optional: true

  '@img/sharp-libvips-linux-riscv64@1.3.2':
    optional: true

  '@img/sharp-libvips-linux-s390x@1.3.2':
    optional: true

  '@img/sharp-libvips-linux-x64@1.3.2':
    optional: true

  '@img/sharp-libvips-linuxmusl-arm64@1.3.2':
    optional: true

  '@img/sharp-libvips-linuxmusl-x64@1.3.2':
    optional: true

  '@img/sharp-linux-arm64@0.35.3':
    optionalDependencies:
      '@img/sharp-libvips-linux-arm64': 1.3.2
    optional: true

  '@img/sharp-linux-arm@0.35.3':
    optionalDependencies:
      '@img/sharp-libvips-linux-arm': 1.3.2
    optional: true

  '@img/sharp-linux-ppc64@0.35.3':
    optionalDependencies:
      '@img/sharp-libvips-linux-ppc64': 1.3.2
    optional: true

  '@img/sharp-linux-riscv64@0.35.3':
    optionalDependencies:
      '@img/sharp-libvips-linux-riscv64': 1.3.2
    optional: true

  '@img/sharp-linux-s390x@0.35.3':
    optionalDependencies:
      '@img/sharp-libvips-linux-s390x': 1.3.2
    optional: true

  '@img/sharp-linux-x64@0.35.3':
    optionalDependencies:
      '@img/sharp-libvips-linux-x64': 1.3.2
    optional: true

  '@img/sharp-linuxmusl-arm64@0.35.3':
    optionalDependencies:
      '@img/sharp-libvips-linuxmusl-arm64': 1.3.2
    optional: true

  '@img/sharp-linuxmusl-x64@0.35.3':
    optionalDependencies:
      '@img/sharp-libvips-linuxmusl-x64': 1.3.2
    optional: true

  '@img/sharp-wasm32@0.35.3':
    dependencies:
      '@emnapi/runtime': 1.11.3
    optional: true

  '@img/sharp-webcontainers-wasm32@0.35.3':
    dependencies:
      '@img/sharp-wasm32': 0.35.3
    optional: true

  '@img/sharp-win32-arm64@0.35.3':
    optional: true

  '@img/sharp-win32-ia32@0.35.3':
    optional: true

  '@img/sharp-win32-x64@0.35.3':
    optional: true

  '@isaacs/fs-minipass@4.0.1':
    dependencies:
      minipass: 7.1.2

  '@jridgewell/gen-mapping@0.3.13':
    dependencies:
      '@jridgewell/sourcemap-codec': 1.5.5
      '@jridgewell/trace-mapping': 0.3.31

  '@jridgewell/remapping@2.3.5':
    dependencies:
      '@jridgewell/gen-mapping': 0.3.13
      '@jridgewell/trace-mapping': 0.3.31

  '@jridgewell/resolve-uri@3.1.2': {}

  '@jridgewell/sourcemap-codec@1.5.5': {}

  '@jridgewell/trace-mapping@0.3.31':
    dependencies:
      '@jridgewell/resolve-uri': 3.1.2
      '@jridgewell/sourcemap-codec': 1.5.5

  '@medv/finder@4.0.2': {}

  '@mermaid-js/parser@0.6.3':
    dependencies:
      langium: 3.3.1

  '@radix-ui/number@1.1.1': {}

  '@radix-ui/primitive@1.1.3': {}

  '@radix-ui/react-accordion@1.2.12(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collapsible': 1.1.12(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-alert-dialog@1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-dialog': 1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-arrow@1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-aspect-ratio@1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-avatar@1.1.10(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-is-hydrated': 0.1.0(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-checkbox@1.3.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-size': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-collapsible@1.1.12(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-collection@1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-compose-refs@1.1.2(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-context-menu@2.2.16(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-menu': 2.1.16(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-context@1.1.2(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-dialog@1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-focus-guards': 1.1.3(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-focus-scope': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      aria-hidden: 1.2.6
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
      react-remove-scroll: 2.7.1(@types/react@19.2.1)(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-direction@1.1.1(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-dismissable-layer@1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-escape-keydown': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-dropdown-menu@2.1.16(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-menu': 2.1.16(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-focus-guards@1.1.3(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-focus-scope@1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-hover-card@1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-popper': 1.2.8(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-id@1.1.1(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-label@2.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-menu@2.1.16(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-focus-guards': 1.1.3(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-focus-scope': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-popper': 1.2.8(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      aria-hidden: 1.2.6
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
      react-remove-scroll: 2.7.1(@types/react@19.2.1)(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-menubar@1.1.16(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-menu': 2.1.16(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-navigation-menu@1.2.14(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-visually-hidden': 1.2.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-popover@1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-focus-guards': 1.1.3(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-focus-scope': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-popper': 1.2.8(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      aria-hidden: 1.2.6
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
      react-remove-scroll: 2.7.1(@types/react@19.2.1)(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-popper@1.2.8(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@floating-ui/react-dom': 2.1.6(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-arrow': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-rect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-size': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/rect': 1.1.1
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-portal@1.1.9(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-presence@1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-primitive@2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-progress@1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-radio-group@1.3.8(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-size': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-roving-focus@1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-scroll-area@1.2.10(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/number': 1.1.1
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-select@2.2.6(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/number': 1.1.1
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-focus-guards': 1.1.3(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-focus-scope': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-popper': 1.2.8(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-visually-hidden': 1.2.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      aria-hidden: 1.2.6
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
      react-remove-scroll: 2.7.1(@types/react@19.2.1)(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-separator@1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-slider@1.3.6(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/number': 1.1.1
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-size': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-slot@1.2.3(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-switch@1.2.6(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-size': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-tabs@1.1.13(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-toggle-group@1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-toggle': 1.1.10(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-toggle@1.1.10(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-tooltip@1.2.8(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-popper': 1.2.8(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-visually-hidden': 1.2.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/react-use-callback-ref@1.1.1(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-use-controllable-state@1.2.2(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      '@radix-ui/react-use-effect-event': 0.0.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-use-effect-event@0.0.2(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-use-escape-keydown@1.1.1(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-use-is-hydrated@0.1.0(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      react: 19.2.1
      use-sync-external-store: 1.6.0(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-use-layout-effect@1.1.1(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-use-previous@1.1.1(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-use-rect@1.1.1(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      '@radix-ui/rect': 1.1.1
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-use-size@1.1.1(@types/react@19.2.1)(react@19.2.1)':
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      react: 19.2.1
    optionalDependencies:
      '@types/react': 19.2.1

  '@radix-ui/react-visually-hidden@1.2.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1
      '@types/react-dom': 19.2.1(@types/react@19.2.1)

  '@radix-ui/rect@1.1.1': {}

  '@rolldown/pluginutils@1.0.0-beta.38': {}

  '@rollup/rollup-android-arm-eabi@4.52.4':
    optional: true

  '@rollup/rollup-android-arm64@4.52.4':
    optional: true

  '@rollup/rollup-darwin-arm64@4.52.4':
    optional: true

  '@rollup/rollup-darwin-x64@4.52.4':
    optional: true

  '@rollup/rollup-freebsd-arm64@4.52.4':
    optional: true

  '@rollup/rollup-freebsd-x64@4.52.4':
    optional: true

  '@rollup/rollup-linux-arm-gnueabihf@4.52.4':
    optional: true

  '@rollup/rollup-linux-arm-musleabihf@4.52.4':
    optional: true

  '@rollup/rollup-linux-arm64-gnu@4.52.4':
    optional: true

  '@rollup/rollup-linux-arm64-musl@4.52.4':
    optional: true

  '@rollup/rollup-linux-loong64-gnu@4.52.4':
    optional: true

  '@rollup/rollup-linux-ppc64-gnu@4.52.4':
    optional: true

  '@rollup/rollup-linux-riscv64-gnu@4.52.4':
    optional: true

  '@rollup/rollup-linux-riscv64-musl@4.52.4':
    optional: true

  '@rollup/rollup-linux-s390x-gnu@4.52.4':
    optional: true

  '@rollup/rollup-linux-x64-gnu@4.52.4':
    optional: true

  '@rollup/rollup-linux-x64-musl@4.52.4':
    optional: true

  '@rollup/rollup-openharmony-arm64@4.52.4':
    optional: true

  '@rollup/rollup-win32-arm64-msvc@4.52.4':
    optional: true

  '@rollup/rollup-win32-ia32-msvc@4.52.4':
    optional: true

  '@rollup/rollup-win32-x64-gnu@4.52.4':
    optional: true

  '@rollup/rollup-win32-x64-msvc@4.52.4':
    optional: true

  '@shikijs/core@3.14.0':
    dependencies:
      '@shikijs/types': 3.14.0
      '@shikijs/vscode-textmate': 10.0.2
      '@types/hast': 3.0.4
      hast-util-to-html: 9.0.5

  '@shikijs/engine-javascript@3.14.0':
    dependencies:
      '@shikijs/types': 3.14.0
      '@shikijs/vscode-textmate': 10.0.2
      oniguruma-to-es: 4.3.3

  '@shikijs/engine-oniguruma@3.14.0':
    dependencies:
      '@shikijs/types': 3.14.0
      '@shikijs/vscode-textmate': 10.0.2

  '@shikijs/langs@3.14.0':
    dependencies:
      '@shikijs/types': 3.14.0

  '@shikijs/themes@3.14.0':
    dependencies:
      '@shikijs/types': 3.14.0

  '@shikijs/types@3.14.0':
    dependencies:
      '@shikijs/vscode-textmate': 10.0.2
      '@types/hast': 3.0.4

  '@shikijs/vscode-textmate@10.0.2': {}

  '@smithy/core@3.33.2':
    dependencies:
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@smithy/credential-provider-imds@4.5.2':
    dependencies:
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@smithy/fetch-http-handler@5.7.2':
    dependencies:
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@smithy/node-http-handler@4.11.2':
    dependencies:
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@smithy/signature-v4@5.7.2':
    dependencies:
      '@smithy/core': 3.33.2
      '@smithy/types': 4.17.2
      tslib: 2.8.1

  '@smithy/types@4.17.2':
    dependencies:
      tslib: 2.8.1

  '@standard-schema/utils@0.3.0': {}

  '@tailwindcss/node@4.1.14':
    dependencies:
      '@jridgewell/remapping': 2.3.5
      enhanced-resolve: 5.18.3
      jiti: 2.6.1
      lightningcss: 1.30.1
      magic-string: 0.30.19
      source-map-js: 1.2.1
      tailwindcss: 4.1.14

  '@tailwindcss/oxide-android-arm64@4.1.14':
    optional: true

  '@tailwindcss/oxide-darwin-arm64@4.1.14':
    optional: true

  '@tailwindcss/oxide-darwin-x64@4.1.14':
    optional: true

  '@tailwindcss/oxide-freebsd-x64@4.1.14':
    optional: true

  '@tailwindcss/oxide-linux-arm-gnueabihf@4.1.14':
    optional: true

  '@tailwindcss/oxide-linux-arm64-gnu@4.1.14':
    optional: true

  '@tailwindcss/oxide-linux-arm64-musl@4.1.14':
    optional: true

  '@tailwindcss/oxide-linux-x64-gnu@4.1.14':
    optional: true

  '@tailwindcss/oxide-linux-x64-musl@4.1.14':
    optional: true

  '@tailwindcss/oxide-wasm32-wasi@4.1.14':
    optional: true

  '@tailwindcss/oxide-win32-arm64-msvc@4.1.14':
    optional: true

  '@tailwindcss/oxide-win32-x64-msvc@4.1.14':
    optional: true

  '@tailwindcss/oxide@4.1.14':
    dependencies:
      detect-libc: 2.1.2
      tar: 7.5.1
    optionalDependencies:
      '@tailwindcss/oxide-android-arm64': 4.1.14
      '@tailwindcss/oxide-darwin-arm64': 4.1.14
      '@tailwindcss/oxide-darwin-x64': 4.1.14
      '@tailwindcss/oxide-freebsd-x64': 4.1.14
      '@tailwindcss/oxide-linux-arm-gnueabihf': 4.1.14
      '@tailwindcss/oxide-linux-arm64-gnu': 4.1.14
      '@tailwindcss/oxide-linux-arm64-musl': 4.1.14
      '@tailwindcss/oxide-linux-x64-gnu': 4.1.14
      '@tailwindcss/oxide-linux-x64-musl': 4.1.14
      '@tailwindcss/oxide-wasm32-wasi': 4.1.14
      '@tailwindcss/oxide-win32-arm64-msvc': 4.1.14
      '@tailwindcss/oxide-win32-x64-msvc': 4.1.14

  '@tailwindcss/typography@0.5.19(tailwindcss@4.1.14)':
    dependencies:
      postcss-selector-parser: 6.0.10
      tailwindcss: 4.1.14

  '@tailwindcss/vite@4.1.14(vite@7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6))':
    dependencies:
      '@tailwindcss/node': 4.1.14
      '@tailwindcss/oxide': 4.1.14
      tailwindcss: 4.1.14
      vite: 7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6)

  '@tanstack/query-core@5.101.4': {}

  '@tanstack/react-query@5.101.4(react@19.2.1)':
    dependencies:
      '@tanstack/query-core': 5.101.4
      react: 19.2.1

  '@trpc/client@11.18.0(@trpc/server@11.18.0(typescript@5.9.3))(typescript@5.9.3)':
    dependencies:
      '@trpc/server': 11.18.0(typescript@5.9.3)
      typescript: 5.9.3

  '@trpc/react-query@11.18.0(@tanstack/react-query@5.101.4(react@19.2.1))(@trpc/client@11.18.0(@trpc/server@11.18.0(typescript@5.9.3))(typescript@5.9.3))(@trpc/server@11.18.0(typescript@5.9.3))(react@19.2.1)(typescript@5.9.3)':
    dependencies:
      '@tanstack/react-query': 5.101.4(react@19.2.1)
      '@trpc/client': 11.18.0(@trpc/server@11.18.0(typescript@5.9.3))(typescript@5.9.3)
      '@trpc/server': 11.18.0(typescript@5.9.3)
      react: 19.2.1
      typescript: 5.9.3

  '@trpc/server@11.18.0(typescript@5.9.3)':
    dependencies:
      typescript: 5.9.3

  '@types/babel__core@7.20.5':
    dependencies:
      '@babel/parser': 7.28.4
      '@babel/types': 7.28.4
      '@types/babel__generator': 7.27.0
      '@types/babel__template': 7.4.4
      '@types/babel__traverse': 7.28.0

  '@types/babel__generator@7.27.0':
    dependencies:
      '@babel/types': 7.28.4

  '@types/babel__template@7.4.4':
    dependencies:
      '@babel/parser': 7.28.4
      '@babel/types': 7.28.4

  '@types/babel__traverse@7.28.0':
    dependencies:
      '@babel/types': 7.28.4

  '@types/body-parser@1.19.6':
    dependencies:
      '@types/connect': 3.4.38
      '@types/node': 24.7.0

  '@types/connect@3.4.38':
    dependencies:
      '@types/node': 24.7.0

  '@types/d3-array@3.2.2': {}

  '@types/d3-axis@3.0.6':
    dependencies:
      '@types/d3-selection': 3.0.11

  '@types/d3-brush@3.0.6':
    dependencies:
      '@types/d3-selection': 3.0.11

  '@types/d3-chord@3.0.6': {}

  '@types/d3-color@3.1.3': {}

  '@types/d3-contour@3.0.6':
    dependencies:
      '@types/d3-array': 3.2.2
      '@types/geojson': 7946.0.16

  '@types/d3-delaunay@6.0.4': {}

  '@types/d3-dispatch@3.0.7': {}

  '@types/d3-drag@3.0.7':
    dependencies:
      '@types/d3-selection': 3.0.11

  '@types/d3-dsv@3.0.7': {}

  '@types/d3-ease@3.0.2': {}

  '@types/d3-fetch@3.0.7':
    dependencies:
      '@types/d3-dsv': 3.0.7

  '@types/d3-force@3.0.10': {}

  '@types/d3-format@3.0.4': {}

  '@types/d3-geo@3.1.0':
    dependencies:
      '@types/geojson': 7946.0.16

  '@types/d3-hierarchy@3.1.7': {}

  '@types/d3-interpolate@3.0.4':
    dependencies:
      '@types/d3-color': 3.1.3

  '@types/d3-path@3.1.1': {}

  '@types/d3-polygon@3.0.2': {}

  '@types/d3-quadtree@3.0.6': {}

  '@types/d3-random@3.0.3': {}

  '@types/d3-scale-chromatic@3.1.0': {}

  '@types/d3-scale@4.0.9':
    dependencies:
      '@types/d3-time': 3.0.4

  '@types/d3-selection@3.0.11': {}

  '@types/d3-shape@3.1.7':
    dependencies:
      '@types/d3-path': 3.1.1

  '@types/d3-time-format@4.0.3': {}

  '@types/d3-time@3.0.4': {}

  '@types/d3-timer@3.0.2': {}

  '@types/d3-transition@3.0.9':
    dependencies:
      '@types/d3-selection': 3.0.11

  '@types/d3-zoom@3.0.8':
    dependencies:
      '@types/d3-interpolate': 3.0.4
      '@types/d3-selection': 3.0.11

  '@types/d3@7.4.3':
    dependencies:
      '@types/d3-array': 3.2.2
      '@types/d3-axis': 3.0.6
      '@types/d3-brush': 3.0.6
      '@types/d3-chord': 3.0.6
      '@types/d3-color': 3.1.3
      '@types/d3-contour': 3.0.6
      '@types/d3-delaunay': 6.0.4
      '@types/d3-dispatch': 3.0.7
      '@types/d3-drag': 3.0.7
      '@types/d3-dsv': 3.0.7
      '@types/d3-ease': 3.0.2
      '@types/d3-fetch': 3.0.7
      '@types/d3-force': 3.0.10
      '@types/d3-format': 3.0.4
      '@types/d3-geo': 3.1.0
      '@types/d3-hierarchy': 3.1.7
      '@types/d3-interpolate': 3.0.4
      '@types/d3-path': 3.1.1
      '@types/d3-polygon': 3.0.2
      '@types/d3-quadtree': 3.0.6
      '@types/d3-random': 3.0.3
      '@types/d3-scale': 4.0.9
      '@types/d3-scale-chromatic': 3.1.0
      '@types/d3-selection': 3.0.11
      '@types/d3-shape': 3.1.7
      '@types/d3-time': 3.0.4
      '@types/d3-time-format': 4.0.3
      '@types/d3-timer': 3.0.2
      '@types/d3-transition': 3.0.9
      '@types/d3-zoom': 3.0.8

  '@types/debug@4.1.12':
    dependencies:
      '@types/ms': 2.1.0

  '@types/estree-jsx@1.0.5':
    dependencies:
      '@types/estree': 1.0.8

  '@types/estree@1.0.8': {}

  '@types/express-serve-static-core@4.19.6':
    dependencies:
      '@types/node': 24.7.0
      '@types/qs': 6.14.0
      '@types/range-parser': 1.2.7
      '@types/send': 1.2.0

  '@types/express@4.17.21':
    dependencies:
      '@types/body-parser': 1.19.6
      '@types/express-serve-static-core': 4.19.6
      '@types/qs': 6.14.0
      '@types/serve-static': 1.15.9

  '@types/geojson@7946.0.16': {}

  '@types/google.maps@3.58.1': {}

  '@types/hast@3.0.4':
    dependencies:
      '@types/unist': 3.0.3

  '@types/http-errors@2.0.5': {}

  '@types/jszip@3.4.1':
    dependencies:
      jszip: 3.10.1

  '@types/katex@0.16.7': {}

  '@types/mdast@4.0.4':
    dependencies:
      '@types/unist': 3.0.3

  '@types/mime@1.3.5': {}

  '@types/ms@2.1.0': {}

  '@types/node@24.7.0':
    dependencies:
      undici-types: 7.14.0

  '@types/pngjs@6.0.5':
    dependencies:
      '@types/node': 24.7.0

  '@types/qs@6.14.0': {}

  '@types/range-parser@1.2.7': {}

  '@types/react-dom@19.2.1(@types/react@19.2.1)':
    dependencies:
      '@types/react': 19.2.1

  '@types/react@19.2.1':
    dependencies:
      csstype: 3.1.3

  '@types/send@0.17.5':
    dependencies:
      '@types/mime': 1.3.5
      '@types/node': 24.7.0

  '@types/send@1.2.0':
    dependencies:
      '@types/node': 24.7.0

  '@types/serve-static@1.15.9':
    dependencies:
      '@types/http-errors': 2.0.5
      '@types/node': 24.7.0
      '@types/send': 0.17.5

  '@types/trusted-types@2.0.7':
    optional: true

  '@types/unist@2.0.11': {}

  '@types/unist@3.0.3': {}

  '@ungap/structured-clone@1.3.0': {}

  '@vitejs/plugin-react@5.0.4(vite@7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6))':
    dependencies:
      '@babel/core': 7.28.4
      '@babel/plugin-transform-react-jsx-self': 7.27.1(@babel/core@7.28.4)
      '@babel/plugin-transform-react-jsx-source': 7.27.1(@babel/core@7.28.4)
      '@rolldown/pluginutils': 1.0.0-beta.38
      '@types/babel__core': 7.20.5
      react-refresh: 0.17.0
      vite: 7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6)
    transitivePeerDependencies:
      - supports-color

  '@vitest/expect@2.1.9':
    dependencies:
      '@vitest/spy': 2.1.9
      '@vitest/utils': 2.1.9
      chai: 5.3.3
      tinyrainbow: 1.2.0

  '@vitest/mocker@2.1.9(vite@5.4.20(@types/node@24.7.0)(lightningcss@1.30.1))':
    dependencies:
      '@vitest/spy': 2.1.9
      estree-walker: 3.0.3
      magic-string: 0.30.19
    optionalDependencies:
      vite: 5.4.20(@types/node@24.7.0)(lightningcss@1.30.1)

  '@vitest/pretty-format@2.1.9':
    dependencies:
      tinyrainbow: 1.2.0

  '@vitest/runner@2.1.9':
    dependencies:
      '@vitest/utils': 2.1.9
      pathe: 1.1.2

  '@vitest/snapshot@2.1.9':
    dependencies:
      '@vitest/pretty-format': 2.1.9
      magic-string: 0.30.19
      pathe: 1.1.2

  '@vitest/spy@2.1.9':
    dependencies:
      tinyspy: 3.0.2

  '@vitest/utils@2.1.9':
    dependencies:
      '@vitest/pretty-format': 2.1.9
      loupe: 3.2.1
      tinyrainbow: 1.2.0

  accepts@1.3.8:
    dependencies:
      mime-types: 2.1.35
      negotiator: 0.6.3

  acorn@8.15.0: {}

  add@2.0.6: {}

  aria-hidden@1.2.6:
    dependencies:
      tslib: 2.8.1

  array-flatten@1.1.1: {}

  assertion-error@2.0.1: {}

  asynckit@0.4.0: {}

  autoprefixer@10.4.21(postcss@8.5.6):
    dependencies:
      browserslist: 4.26.3
      caniuse-lite: 1.0.30001748
      fraction.js: 4.3.7
      normalize-range: 0.1.2
      picocolors: 1.1.1
      postcss: 8.5.6
      postcss-value-parser: 4.2.0

  aws-ssl-profiles@1.1.2: {}

  axios@1.12.2:
    dependencies:
      follow-redirects: 1.15.11
      form-data: 4.0.4
      proxy-from-env: 1.1.0
    transitivePeerDependencies:
      - debug

  bail@2.0.2: {}

  baseline-browser-mapping@2.8.13: {}

  body-parser@1.20.3:
    dependencies:
      bytes: 3.1.2
      content-type: 1.0.5
      debug: 2.6.9
      depd: 2.0.0
      destroy: 1.2.0
      http-errors: 2.0.0
      iconv-lite: 0.4.24
      on-finished: 2.4.1
      qs: 6.13.0
      raw-body: 2.5.2
      type-is: 1.6.18
      unpipe: 1.0.0
    transitivePeerDependencies:
      - supports-color

  bowser@2.14.1: {}

  browserslist@4.26.3:
    dependencies:
      baseline-browser-mapping: 2.8.13
      caniuse-lite: 1.0.30001748
      electron-to-chromium: 1.5.232
      node-releases: 2.0.23
      update-browserslist-db: 1.1.3(browserslist@4.26.3)

  buffer-from@1.1.2: {}

  bytes@3.1.2: {}

  cac@6.7.14: {}

  call-bind-apply-helpers@1.0.2:
    dependencies:
      es-errors: 1.3.0
      function-bind: 1.1.2

  call-bound@1.0.4:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      get-intrinsic: 1.3.0

  caniuse-lite@1.0.30001748: {}

  ccount@2.0.1: {}

  chai@5.3.3:
    dependencies:
      assertion-error: 2.0.1
      check-error: 2.1.1
      deep-eql: 5.0.2
      loupe: 3.2.1
      pathval: 2.0.1

  character-entities-html4@2.1.0: {}

  character-entities-legacy@3.0.0: {}

  character-entities@2.0.2: {}

  character-reference-invalid@2.0.1: {}

  check-error@2.1.1: {}

  chevrotain-allstar@0.3.1(chevrotain@11.0.3):
    dependencies:
      chevrotain: 11.0.3
      lodash-es: 4.17.21

  chevrotain@11.0.3:
    dependencies:
      '@chevrotain/cst-dts-gen': 11.0.3
      '@chevrotain/gast': 11.0.3
      '@chevrotain/regexp-to-ast': 11.0.3
      '@chevrotain/types': 11.0.3
      '@chevrotain/utils': 11.0.3
      lodash-es: 4.17.21

  chownr@3.0.0: {}

  class-variance-authority@0.7.1:
    dependencies:
      clsx: 2.1.1

  clsx@2.1.1: {}

  cmdk@1.1.1(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1):
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-dialog': 1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.1)(react@19.2.1)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    transitivePeerDependencies:
      - '@types/react'
      - '@types/react-dom'

  combined-stream@1.0.8:
    dependencies:
      delayed-stream: 1.0.0

  comma-separated-tokens@2.0.3: {}

  commander@7.2.0: {}

  commander@8.3.0: {}

  confbox@0.1.8: {}

  confbox@0.2.2: {}

  content-disposition@0.5.4:
    dependencies:
      safe-buffer: 5.2.1

  content-type@1.0.5: {}

  convert-source-map@2.0.0: {}

  cookie-signature@1.0.6: {}

  cookie@0.7.1: {}

  cookie@1.1.1: {}

  copy-anything@3.0.5:
    dependencies:
      is-what: 4.1.16

  core-util-is@1.0.3: {}

  cose-base@1.0.3:
    dependencies:
      layout-base: 1.0.2

  cose-base@2.2.0:
    dependencies:
      layout-base: 2.0.1

  cssesc@3.0.0: {}

  csstype@3.1.3: {}

  cytoscape-cose-bilkent@4.1.0(cytoscape@3.33.1):
    dependencies:
      cose-base: 1.0.3
      cytoscape: 3.33.1

  cytoscape-fcose@2.2.0(cytoscape@3.33.1):
    dependencies:
      cose-base: 2.2.0
      cytoscape: 3.33.1

  cytoscape@3.33.1: {}

  d3-array@2.12.1:
    dependencies:
      internmap: 1.0.1

  d3-array@3.2.4:
    dependencies:
      internmap: 2.0.3

  d3-axis@3.0.0: {}

  d3-brush@3.0.0:
    dependencies:
      d3-dispatch: 3.0.1
      d3-drag: 3.0.0
      d3-interpolate: 3.0.1
      d3-selection: 3.0.0
      d3-transition: 3.0.1(d3-selection@3.0.0)

  d3-chord@3.0.1:
    dependencies:
      d3-path: 3.1.0

  d3-color@3.1.0: {}

  d3-contour@4.0.2:
    dependencies:
      d3-array: 3.2.4

  d3-delaunay@6.0.4:
    dependencies:
      delaunator: 5.0.1

  d3-dispatch@3.0.1: {}

  d3-drag@3.0.0:
    dependencies:
      d3-dispatch: 3.0.1
      d3-selection: 3.0.0

  d3-dsv@3.0.1:
    dependencies:
      commander: 7.2.0
      iconv-lite: 0.6.3
      rw: 1.3.3

  d3-ease@3.0.1: {}

  d3-fetch@3.0.1:
    dependencies:
      d3-dsv: 3.0.1

  d3-force@3.0.0:
    dependencies:
      d3-dispatch: 3.0.1
      d3-quadtree: 3.0.1
      d3-timer: 3.0.1

  d3-format@3.1.0: {}

  d3-geo@3.1.1:
    dependencies:
      d3-array: 3.2.4

  d3-hierarchy@3.1.2: {}

  d3-interpolate@3.0.1:
    dependencies:
      d3-color: 3.1.0

  d3-path@1.0.9: {}

  d3-path@3.1.0: {}

  d3-polygon@3.0.1: {}

  d3-quadtree@3.0.1: {}

  d3-random@3.0.1: {}

  d3-sankey@0.12.3:
    dependencies:
      d3-array: 2.12.1
      d3-shape: 1.3.7

  d3-scale-chromatic@3.1.0:
    dependencies:
      d3-color: 3.1.0
      d3-interpolate: 3.0.1

  d3-scale@4.0.2:
    dependencies:
      d3-array: 3.2.4
      d3-format: 3.1.0
      d3-interpolate: 3.0.1
      d3-time: 3.1.0
      d3-time-format: 4.1.0

  d3-selection@3.0.0: {}

  d3-shape@1.3.7:
    dependencies:
      d3-path: 1.0.9

  d3-shape@3.2.0:
    dependencies:
      d3-path: 3.1.0

  d3-time-format@4.1.0:
    dependencies:
      d3-time: 3.1.0

  d3-time@3.1.0:
    dependencies:
      d3-array: 3.2.4

  d3-timer@3.0.1: {}

  d3-transition@3.0.1(d3-selection@3.0.0):
    dependencies:
      d3-color: 3.1.0
      d3-dispatch: 3.0.1
      d3-ease: 3.0.1
      d3-interpolate: 3.0.1
      d3-selection: 3.0.0
      d3-timer: 3.0.1

  d3-zoom@3.0.0:
    dependencies:
      d3-dispatch: 3.0.1
      d3-drag: 3.0.0
      d3-interpolate: 3.0.1
      d3-selection: 3.0.0
      d3-transition: 3.0.1(d3-selection@3.0.0)

  d3@7.9.0:
    dependencies:
      d3-array: 3.2.4
      d3-axis: 3.0.0
      d3-brush: 3.0.0
      d3-chord: 3.0.1
      d3-color: 3.1.0
      d3-contour: 4.0.2
      d3-delaunay: 6.0.4
      d3-dispatch: 3.0.1
      d3-drag: 3.0.0
      d3-dsv: 3.0.1
      d3-ease: 3.0.1
      d3-fetch: 3.0.1
      d3-force: 3.0.0
      d3-format: 3.1.0
      d3-geo: 3.1.1
      d3-hierarchy: 3.1.2
      d3-interpolate: 3.0.1
      d3-path: 3.1.0
      d3-polygon: 3.0.1
      d3-quadtree: 3.0.1
      d3-random: 3.0.1
      d3-scale: 4.0.2
      d3-scale-chromatic: 3.1.0
      d3-selection: 3.0.0
      d3-shape: 3.2.0
      d3-time: 3.1.0
      d3-time-format: 4.1.0
      d3-timer: 3.0.1
      d3-transition: 3.0.1(d3-selection@3.0.0)
      d3-zoom: 3.0.0

  dagre-d3-es@7.0.11:
    dependencies:
      d3: 7.9.0
      lodash-es: 4.17.21

  date-fns-jalali@4.1.0-0: {}

  date-fns@4.1.0: {}

  dayjs@1.11.18: {}

  debug@2.6.9:
    dependencies:
      ms: 2.0.0

  debug@4.4.3:
    dependencies:
      ms: 2.1.3

  decimal.js-light@2.5.1: {}

  decode-named-character-reference@1.2.0:
    dependencies:
      character-entities: 2.0.2

  deep-eql@5.0.2: {}

  delaunator@5.0.1:
    dependencies:
      robust-predicates: 3.0.2

  delayed-stream@1.0.0: {}

  depd@2.0.0: {}

  dequal@2.0.3: {}

  destroy@1.2.0: {}

  detect-libc@2.1.2: {}

  detect-node-es@1.1.0: {}

  devlop@1.1.0:
    dependencies:
      dequal: 2.0.3

  dom-helpers@5.2.1:
    dependencies:
      '@babel/runtime': 7.28.4
      csstype: 3.1.3

  dompurify@3.3.0:
    optionalDependencies:
      '@types/trusted-types': 2.0.7

  dotenv@17.4.2: {}

  drizzle-kit@0.31.10:
    dependencies:
      '@drizzle-team/brocli': 0.10.2
      '@esbuild-kit/esm-loader': 2.6.5
      esbuild: 0.25.10
      tsx: 4.23.12

  drizzle-orm@0.44.7(mysql2@3.23.4(@types/node@24.7.0)):
    optionalDependencies:
      mysql2: 3.23.4(@types/node@24.7.0)

  dunder-proto@1.0.1:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      es-errors: 1.3.0
      gopd: 1.2.0

  ee-first@1.1.1: {}

  electron-to-chromium@1.5.232: {}

  embla-carousel-react@8.6.0(react@19.2.1):
    dependencies:
      embla-carousel: 8.6.0
      embla-carousel-reactive-utils: 8.6.0(embla-carousel@8.6.0)
      react: 19.2.1

  embla-carousel-reactive-utils@8.6.0(embla-carousel@8.6.0):
    dependencies:
      embla-carousel: 8.6.0

  embla-carousel@8.6.0: {}

  encodeurl@1.0.2: {}

  encodeurl@2.0.0: {}

  enhanced-resolve@5.18.3:
    dependencies:
      graceful-fs: 4.2.11
      tapable: 2.3.0

  entities@6.0.1: {}

  es-define-property@1.0.1: {}

  es-errors@1.3.0: {}

  es-module-lexer@1.7.0: {}

  es-object-atoms@1.1.1:
    dependencies:
      es-errors: 1.3.0

  es-set-tostringtag@2.1.0:
    dependencies:
      es-errors: 1.3.0
      get-intrinsic: 1.3.0
      has-tostringtag: 1.0.2
      hasown: 2.0.2

  esbuild@0.18.20:
    optionalDependencies:
      '@esbuild/android-arm': 0.18.20
      '@esbuild/android-arm64': 0.18.20
      '@esbuild/android-x64': 0.18.20
      '@esbuild/darwin-arm64': 0.18.20
      '@esbuild/darwin-x64': 0.18.20
      '@esbuild/freebsd-arm64': 0.18.20
      '@esbuild/freebsd-x64': 0.18.20
      '@esbuild/linux-arm': 0.18.20
      '@esbuild/linux-arm64': 0.18.20
      '@esbuild/linux-ia32': 0.18.20
      '@esbuild/linux-loong64': 0.18.20
      '@esbuild/linux-mips64el': 0.18.20
      '@esbuild/linux-ppc64': 0.18.20
      '@esbuild/linux-riscv64': 0.18.20
      '@esbuild/linux-s390x': 0.18.20
      '@esbuild/linux-x64': 0.18.20
      '@esbuild/netbsd-x64': 0.18.20
      '@esbuild/openbsd-x64': 0.18.20
      '@esbuild/sunos-x64': 0.18.20
      '@esbuild/win32-arm64': 0.18.20
      '@esbuild/win32-ia32': 0.18.20
      '@esbuild/win32-x64': 0.18.20

  esbuild@0.21.5:
    optionalDependencies:
      '@esbuild/aix-ppc64': 0.21.5
      '@esbuild/android-arm': 0.21.5
      '@esbuild/android-arm64': 0.21.5
      '@esbuild/android-x64': 0.21.5
      '@esbuild/darwin-arm64': 0.21.5
      '@esbuild/darwin-x64': 0.21.5
      '@esbuild/freebsd-arm64': 0.21.5
      '@esbuild/freebsd-x64': 0.21.5
      '@esbuild/linux-arm': 0.21.5
      '@esbuild/linux-arm64': 0.21.5
      '@esbuild/linux-ia32': 0.21.5
      '@esbuild/linux-loong64': 0.21.5
      '@esbuild/linux-mips64el': 0.21.5
      '@esbuild/linux-ppc64': 0.21.5
      '@esbuild/linux-riscv64': 0.21.5
      '@esbuild/linux-s390x': 0.21.5
      '@esbuild/linux-x64': 0.21.5
      '@esbuild/netbsd-x64': 0.21.5
      '@esbuild/openbsd-x64': 0.21.5
      '@esbuild/sunos-x64': 0.21.5
      '@esbuild/win32-arm64': 0.21.5
      '@esbuild/win32-ia32': 0.21.5
      '@esbuild/win32-x64': 0.21.5

  esbuild@0.25.10:
    optionalDependencies:
      '@esbuild/aix-ppc64': 0.25.10
      '@esbuild/android-arm': 0.25.10
      '@esbuild/android-arm64': 0.25.10
      '@esbuild/android-x64': 0.25.10
      '@esbuild/darwin-arm64': 0.25.10
      '@esbuild/darwin-x64': 0.25.10
      '@esbuild/freebsd-arm64': 0.25.10
      '@esbuild/freebsd-x64': 0.25.10
      '@esbuild/linux-arm': 0.25.10
      '@esbuild/linux-arm64': 0.25.10
      '@esbuild/linux-ia32': 0.25.10
      '@esbuild/linux-loong64': 0.25.10
      '@esbuild/linux-mips64el': 0.25.10
      '@esbuild/linux-ppc64': 0.25.10
      '@esbuild/linux-riscv64': 0.25.10
      '@esbuild/linux-s390x': 0.25.10
      '@esbuild/linux-x64': 0.25.10
      '@esbuild/netbsd-arm64': 0.25.10
      '@esbuild/netbsd-x64': 0.25.10
      '@esbuild/openbsd-arm64': 0.25.10
      '@esbuild/openbsd-x64': 0.25.10
      '@esbuild/openharmony-arm64': 0.25.10
      '@esbuild/sunos-x64': 0.25.10
      '@esbuild/win32-arm64': 0.25.10
      '@esbuild/win32-ia32': 0.25.10
      '@esbuild/win32-x64': 0.25.10

  esbuild@0.28.2:
    optionalDependencies:
      '@esbuild/aix-ppc64': 0.28.2
      '@esbuild/android-arm': 0.28.2
      '@esbuild/android-arm64': 0.28.2
      '@esbuild/android-x64': 0.28.2
      '@esbuild/darwin-arm64': 0.28.2
      '@esbuild/darwin-x64': 0.28.2
      '@esbuild/freebsd-arm64': 0.28.2
      '@esbuild/freebsd-x64': 0.28.2
      '@esbuild/linux-arm': 0.28.2
      '@esbuild/linux-arm64': 0.28.2
      '@esbuild/linux-ia32': 0.28.2
      '@esbuild/linux-loong64': 0.28.2
      '@esbuild/linux-mips64el': 0.28.2
      '@esbuild/linux-ppc64': 0.28.2
      '@esbuild/linux-riscv64': 0.28.2
      '@esbuild/linux-s390x': 0.28.2
      '@esbuild/linux-x64': 0.28.2
      '@esbuild/netbsd-arm64': 0.28.2
      '@esbuild/netbsd-x64': 0.28.2
      '@esbuild/openbsd-arm64': 0.28.2
      '@esbuild/openbsd-x64': 0.28.2
      '@esbuild/openharmony-arm64': 0.28.2
      '@esbuild/sunos-x64': 0.28.2
      '@esbuild/win32-arm64': 0.28.2
      '@esbuild/win32-ia32': 0.28.2
      '@esbuild/win32-x64': 0.28.2

  escalade@3.2.0: {}

  escape-html@1.0.3: {}

  escape-string-regexp@5.0.0: {}

  estree-util-is-identifier-name@3.0.0: {}

  estree-walker@2.0.2: {}

  estree-walker@3.0.3:
    dependencies:
      '@types/estree': 1.0.8

  etag@1.8.1: {}

  eventemitter3@4.0.7: {}

  expect-type@1.2.2: {}

  express@4.21.2:
    dependencies:
      accepts: 1.3.8
      array-flatten: 1.1.1
      body-parser: 1.20.3
      content-disposition: 0.5.4
      content-type: 1.0.5
      cookie: 0.7.1
      cookie-signature: 1.0.6
      debug: 2.6.9
      depd: 2.0.0
      encodeurl: 2.0.0
      escape-html: 1.0.3
      etag: 1.8.1
      finalhandler: 1.3.1
      fresh: 0.5.2
      http-errors: 2.0.0
      merge-descriptors: 1.0.3
      methods: 1.1.2
      on-finished: 2.4.1
      parseurl: 1.3.3
      path-to-regexp: 0.1.12
      proxy-addr: 2.0.7
      qs: 6.13.0
      range-parser: 1.2.1
      safe-buffer: 5.2.1
      send: 0.19.0
      serve-static: 1.16.2
      setprototypeof: 1.2.0
      statuses: 2.0.1
      type-is: 1.6.18
      utils-merge: 1.0.1
      vary: 1.1.2
    transitivePeerDependencies:
      - supports-color

  exsolve@1.0.7: {}

  extend@3.0.2: {}

  fast-equals@5.3.2: {}

  fdir@6.5.0(picomatch@4.0.3):
    optionalDependencies:
      picomatch: 4.0.3

  finalhandler@1.3.1:
    dependencies:
      debug: 2.6.9
      encodeurl: 2.0.0
      escape-html: 1.0.3
      on-finished: 2.4.1
      parseurl: 1.3.3
      statuses: 2.0.1
      unpipe: 1.0.0
    transitivePeerDependencies:
      - supports-color

  follow-redirects@1.15.11: {}

  form-data@4.0.4:
    dependencies:
      asynckit: 0.4.0
      combined-stream: 1.0.8
      es-set-tostringtag: 2.1.0
      hasown: 2.0.2
      mime-types: 2.1.35

  forwarded@0.2.0: {}

  fraction.js@4.3.7: {}

  framer-motion@12.23.22(react-dom@19.2.1(react@19.2.1))(react@19.2.1):
    dependencies:
      motion-dom: 12.23.21
      motion-utils: 12.23.6
      tslib: 2.8.1
    optionalDependencies:
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)

  fresh@0.5.2: {}

  fsevents@2.3.3:
    optional: true

  function-bind@1.1.2: {}

  generate-function@2.3.1:
    dependencies:
      is-property: 1.0.2

  gensync@1.0.0-beta.2: {}

  get-intrinsic@1.3.0:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      es-define-property: 1.0.1
      es-errors: 1.3.0
      es-object-atoms: 1.1.1
      function-bind: 1.1.2
      get-proto: 1.0.1
      gopd: 1.2.0
      has-symbols: 1.1.0
      hasown: 2.0.2
      math-intrinsics: 1.1.0

  get-nonce@1.0.1: {}

  get-proto@1.0.1:
    dependencies:
      dunder-proto: 1.0.1
      es-object-atoms: 1.1.1

  get-tsconfig@4.12.0:
    dependencies:
      resolve-pkg-maps: 1.0.0

  globals@15.15.0: {}

  gopd@1.2.0: {}

  graceful-fs@4.2.11: {}

  hachure-fill@0.5.2: {}

  has-symbols@1.1.0: {}

  has-tostringtag@1.0.2:
    dependencies:
      has-symbols: 1.1.0

  hasown@2.0.2:
    dependencies:
      function-bind: 1.1.2

  hast-util-from-dom@5.0.1:
    dependencies:
      '@types/hast': 3.0.4
      hastscript: 9.0.1
      web-namespaces: 2.0.1

  hast-util-from-html-isomorphic@2.0.0:
    dependencies:
      '@types/hast': 3.0.4
      hast-util-from-dom: 5.0.1
      hast-util-from-html: 2.0.3
      unist-util-remove-position: 5.0.0

  hast-util-from-html@2.0.3:
    dependencies:
      '@types/hast': 3.0.4
      devlop: 1.1.0
      hast-util-from-parse5: 8.0.3
      parse5: 7.3.0
      vfile: 6.0.3
      vfile-message: 4.0.3

  hast-util-from-parse5@8.0.3:
    dependencies:
      '@types/hast': 3.0.4
      '@types/unist': 3.0.3
      devlop: 1.1.0
      hastscript: 9.0.1
      property-information: 7.1.0
      vfile: 6.0.3
      vfile-location: 5.0.3
      web-namespaces: 2.0.1

  hast-util-is-element@3.0.0:
    dependencies:
      '@types/hast': 3.0.4

  hast-util-parse-selector@4.0.0:
    dependencies:
      '@types/hast': 3.0.4

  hast-util-raw@9.1.0:
    dependencies:
      '@types/hast': 3.0.4
      '@types/unist': 3.0.3
      '@ungap/structured-clone': 1.3.0
      hast-util-from-parse5: 8.0.3
      hast-util-to-parse5: 8.0.0
      html-void-elements: 3.0.0
      mdast-util-to-hast: 13.2.0
      parse5: 7.3.0
      unist-util-position: 5.0.0
      unist-util-visit: 5.0.0
      vfile: 6.0.3
      web-namespaces: 2.0.1
      zwitch: 2.0.4

  hast-util-to-html@9.0.5:
    dependencies:
      '@types/hast': 3.0.4
      '@types/unist': 3.0.3
      ccount: 2.0.1
      comma-separated-tokens: 2.0.3
      hast-util-whitespace: 3.0.0
      html-void-elements: 3.0.0
      mdast-util-to-hast: 13.2.0
      property-information: 7.1.0
      space-separated-tokens: 2.0.2
      stringify-entities: 4.0.4
      zwitch: 2.0.4

  hast-util-to-jsx-runtime@2.3.6:
    dependencies:
      '@types/estree': 1.0.8
      '@types/hast': 3.0.4
      '@types/unist': 3.0.3
      comma-separated-tokens: 2.0.3
      devlop: 1.1.0
      estree-util-is-identifier-name: 3.0.0
      hast-util-whitespace: 3.0.0
      mdast-util-mdx-expression: 2.0.1
      mdast-util-mdx-jsx: 3.2.0
      mdast-util-mdxjs-esm: 2.0.1
      property-information: 7.1.0
      space-separated-tokens: 2.0.2
      style-to-js: 1.1.18
      unist-util-position: 5.0.0
      vfile-message: 4.0.3
    transitivePeerDependencies:
      - supports-color

  hast-util-to-parse5@8.0.0:
    dependencies:
      '@types/hast': 3.0.4
      comma-separated-tokens: 2.0.3
      devlop: 1.1.0
      property-information: 6.5.0
      space-separated-tokens: 2.0.2
      web-namespaces: 2.0.1
      zwitch: 2.0.4

  hast-util-to-text@4.0.2:
    dependencies:
      '@types/hast': 3.0.4
      '@types/unist': 3.0.3
      hast-util-is-element: 3.0.0
      unist-util-find-after: 5.0.0

  hast-util-whitespace@3.0.0:
    dependencies:
      '@types/hast': 3.0.4

  hastscript@9.0.1:
    dependencies:
      '@types/hast': 3.0.4
      comma-separated-tokens: 2.0.3
      hast-util-parse-selector: 4.0.0
      property-information: 7.1.0
      space-separated-tokens: 2.0.2

  heic2any@0.0.4: {}

  html-url-attributes@3.0.1: {}

  html-void-elements@3.0.0: {}

  http-errors@2.0.0:
    dependencies:
      depd: 2.0.0
      inherits: 2.0.4
      setprototypeof: 1.2.0
      statuses: 2.0.1
      toidentifier: 1.0.1

  iconv-lite@0.4.24:
    dependencies:
      safer-buffer: 2.1.2

  iconv-lite@0.6.3:
    dependencies:
      safer-buffer: 2.1.2

  iconv-lite@0.7.3:
    dependencies:
      safer-buffer: 2.1.2

  immediate@3.0.6: {}

  inherits@2.0.4: {}

  inline-style-parser@0.2.4: {}

  input-otp@1.4.2(react-dom@19.2.1(react@19.2.1))(react@19.2.1):
    dependencies:
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)

  internmap@1.0.1: {}

  internmap@2.0.3: {}

  ipaddr.js@1.9.1: {}

  is-alphabetical@2.0.1: {}

  is-alphanumerical@2.0.1:
    dependencies:
      is-alphabetical: 2.0.1
      is-decimal: 2.0.1

  is-decimal@2.0.1: {}

  is-hexadecimal@2.0.1: {}

  is-plain-obj@4.1.0: {}

  is-property@1.0.2: {}

  is-what@4.1.16: {}

  isarray@1.0.0: {}

  jiti@2.6.1: {}

  jose@6.1.0: {}

  js-tokens@4.0.0: {}

  jsesc@3.1.0: {}

  json5@2.2.3: {}

  jszip@3.10.1:
    dependencies:
      lie: 3.3.0
      pako: 1.0.11
      readable-stream: 2.3.8
      setimmediate: 1.0.5

  katex@0.16.25:
    dependencies:
      commander: 8.3.0

  khroma@2.1.0: {}

  kolorist@1.8.0: {}

  langium@3.3.1:
    dependencies:
      chevrotain: 11.0.3
      chevrotain-allstar: 0.3.1(chevrotain@11.0.3)
      vscode-languageserver: 9.0.1
      vscode-languageserver-textdocument: 1.0.12
      vscode-uri: 3.0.8

  layout-base@1.0.2: {}

  layout-base@2.0.1: {}

  lie@3.3.0:
    dependencies:
      immediate: 3.0.6

  lightningcss-darwin-arm64@1.30.1:
    optional: true

  lightningcss-darwin-x64@1.30.1:
    optional: true

  lightningcss-freebsd-x64@1.30.1:
    optional: true

  lightningcss-linux-arm-gnueabihf@1.30.1:
    optional: true

  lightningcss-linux-arm64-gnu@1.30.1:
    optional: true

  lightningcss-linux-arm64-musl@1.30.1:
    optional: true

  lightningcss-linux-x64-gnu@1.30.1:
    optional: true

  lightningcss-linux-x64-musl@1.30.1:
    optional: true

  lightningcss-win32-arm64-msvc@1.30.1:
    optional: true

  lightningcss-win32-x64-msvc@1.30.1:
    optional: true

  lightningcss@1.30.1:
    dependencies:
      detect-libc: 2.1.2
    optionalDependencies:
      lightningcss-darwin-arm64: 1.30.1
      lightningcss-darwin-x64: 1.30.1
      lightningcss-freebsd-x64: 1.30.1
      lightningcss-linux-arm-gnueabihf: 1.30.1
      lightningcss-linux-arm64-gnu: 1.30.1
      lightningcss-linux-arm64-musl: 1.30.1
      lightningcss-linux-x64-gnu: 1.30.1
      lightningcss-linux-x64-musl: 1.30.1
      lightningcss-win32-arm64-msvc: 1.30.1
      lightningcss-win32-x64-msvc: 1.30.1

  local-pkg@1.1.2:
    dependencies:
      mlly: 1.8.0
      pkg-types: 2.3.0
      quansync: 0.2.11

  lodash-es@4.17.21: {}

  lodash@4.17.21: {}

  long@5.3.2: {}

  longest-streak@3.1.0: {}

  loose-envify@1.4.0:
    dependencies:
      js-tokens: 4.0.0

  loupe@3.2.1: {}

  lru-cache@5.1.1:
    dependencies:
      yallist: 3.1.1

  lru.min@1.1.4: {}

  lucide-react@0.453.0(react@19.2.1):
    dependencies:
      react: 19.2.1

  lucide-react@0.542.0(react@19.2.1):
    dependencies:
      react: 19.2.1

  magic-string@0.30.19:
    dependencies:
      '@jridgewell/sourcemap-codec': 1.5.5

  markdown-table@3.0.4: {}

  marked@16.4.1: {}

  math-intrinsics@1.1.0: {}

  mdast-util-find-and-replace@3.0.2:
    dependencies:
      '@types/mdast': 4.0.4
      escape-string-regexp: 5.0.0
      unist-util-is: 6.0.1
      unist-util-visit-parents: 6.0.2

  mdast-util-from-markdown@2.0.2:
    dependencies:
      '@types/mdast': 4.0.4
      '@types/unist': 3.0.3
      decode-named-character-reference: 1.2.0
      devlop: 1.1.0
      mdast-util-to-string: 4.0.0
      micromark: 4.0.2
      micromark-util-decode-numeric-character-reference: 2.0.2
      micromark-util-decode-string: 2.0.1
      micromark-util-normalize-identifier: 2.0.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2
      unist-util-stringify-position: 4.0.0
    transitivePeerDependencies:
      - supports-color

  mdast-util-gfm-autolink-literal@2.0.1:
    dependencies:
      '@types/mdast': 4.0.4
      ccount: 2.0.1
      devlop: 1.1.0
      mdast-util-find-and-replace: 3.0.2
      micromark-util-character: 2.1.1

  mdast-util-gfm-footnote@2.1.0:
    dependencies:
      '@types/mdast': 4.0.4
      devlop: 1.1.0
      mdast-util-from-markdown: 2.0.2
      mdast-util-to-markdown: 2.1.2
      micromark-util-normalize-identifier: 2.0.1
    transitivePeerDependencies:
      - supports-color

  mdast-util-gfm-strikethrough@2.0.0:
    dependencies:
      '@types/mdast': 4.0.4
      mdast-util-from-markdown: 2.0.2
      mdast-util-to-markdown: 2.1.2
    transitivePeerDependencies:
      - supports-color

  mdast-util-gfm-table@2.0.0:
    dependencies:
      '@types/mdast': 4.0.4
      devlop: 1.1.0
      markdown-table: 3.0.4
      mdast-util-from-markdown: 2.0.2
      mdast-util-to-markdown: 2.1.2
    transitivePeerDependencies:
      - supports-color

  mdast-util-gfm-task-list-item@2.0.0:
    dependencies:
      '@types/mdast': 4.0.4
      devlop: 1.1.0
      mdast-util-from-markdown: 2.0.2
      mdast-util-to-markdown: 2.1.2
    transitivePeerDependencies:
      - supports-color

  mdast-util-gfm@3.1.0:
    dependencies:
      mdast-util-from-markdown: 2.0.2
      mdast-util-gfm-autolink-literal: 2.0.1
      mdast-util-gfm-footnote: 2.1.0
      mdast-util-gfm-strikethrough: 2.0.0
      mdast-util-gfm-table: 2.0.0
      mdast-util-gfm-task-list-item: 2.0.0
      mdast-util-to-markdown: 2.1.2
    transitivePeerDependencies:
      - supports-color

  mdast-util-math@3.0.0:
    dependencies:
      '@types/hast': 3.0.4
      '@types/mdast': 4.0.4
      devlop: 1.1.0
      longest-streak: 3.1.0
      mdast-util-from-markdown: 2.0.2
      mdast-util-to-markdown: 2.1.2
      unist-util-remove-position: 5.0.0
    transitivePeerDependencies:
      - supports-color

  mdast-util-mdx-expression@2.0.1:
    dependencies:
      '@types/estree-jsx': 1.0.5
      '@types/hast': 3.0.4
      '@types/mdast': 4.0.4
      devlop: 1.1.0
      mdast-util-from-markdown: 2.0.2
      mdast-util-to-markdown: 2.1.2
    transitivePeerDependencies:
      - supports-color

  mdast-util-mdx-jsx@3.2.0:
    dependencies:
      '@types/estree-jsx': 1.0.5
      '@types/hast': 3.0.4
      '@types/mdast': 4.0.4
      '@types/unist': 3.0.3
      ccount: 2.0.1
      devlop: 1.1.0
      mdast-util-from-markdown: 2.0.2
      mdast-util-to-markdown: 2.1.2
      parse-entities: 4.0.2
      stringify-entities: 4.0.4
      unist-util-stringify-position: 4.0.0
      vfile-message: 4.0.3
    transitivePeerDependencies:
      - supports-color

  mdast-util-mdxjs-esm@2.0.1:
    dependencies:
      '@types/estree-jsx': 1.0.5
      '@types/hast': 3.0.4
      '@types/mdast': 4.0.4
      devlop: 1.1.0
      mdast-util-from-markdown: 2.0.2
      mdast-util-to-markdown: 2.1.2
    transitivePeerDependencies:
      - supports-color

  mdast-util-phrasing@4.1.0:
    dependencies:
      '@types/mdast': 4.0.4
      unist-util-is: 6.0.1

  mdast-util-to-hast@13.2.0:
    dependencies:
      '@types/hast': 3.0.4
      '@types/mdast': 4.0.4
      '@ungap/structured-clone': 1.3.0
      devlop: 1.1.0
      micromark-util-sanitize-uri: 2.0.1
      trim-lines: 3.0.1
      unist-util-position: 5.0.0
      unist-util-visit: 5.0.0
      vfile: 6.0.3

  mdast-util-to-markdown@2.1.2:
    dependencies:
      '@types/mdast': 4.0.4
      '@types/unist': 3.0.3
      longest-streak: 3.1.0
      mdast-util-phrasing: 4.1.0
      mdast-util-to-string: 4.0.0
      micromark-util-classify-character: 2.0.1
      micromark-util-decode-string: 2.0.1
      unist-util-visit: 5.0.0
      zwitch: 2.0.4

  mdast-util-to-string@4.0.0:
    dependencies:
      '@types/mdast': 4.0.4

  media-typer@0.3.0: {}

  merge-descriptors@1.0.3: {}

  mermaid@11.12.0:
    dependencies:
      '@braintree/sanitize-url': 7.1.1
      '@iconify/utils': 3.0.2
      '@mermaid-js/parser': 0.6.3
      '@types/d3': 7.4.3
      cytoscape: 3.33.1
      cytoscape-cose-bilkent: 4.1.0(cytoscape@3.33.1)
      cytoscape-fcose: 2.2.0(cytoscape@3.33.1)
      d3: 7.9.0
      d3-sankey: 0.12.3
      dagre-d3-es: 7.0.11
      dayjs: 1.11.18
      dompurify: 3.3.0
      katex: 0.16.25
      khroma: 2.1.0
      lodash-es: 4.17.21
      marked: 16.4.1
      roughjs: 4.6.6
      stylis: 4.3.6
      ts-dedent: 2.2.0
      uuid: 11.1.0
    transitivePeerDependencies:
      - supports-color

  methods@1.1.2: {}

  micromark-core-commonmark@2.0.3:
    dependencies:
      decode-named-character-reference: 1.2.0
      devlop: 1.1.0
      micromark-factory-destination: 2.0.1
      micromark-factory-label: 2.0.1
      micromark-factory-space: 2.0.1
      micromark-factory-title: 2.0.1
      micromark-factory-whitespace: 2.0.1
      micromark-util-character: 2.1.1
      micromark-util-chunked: 2.0.1
      micromark-util-classify-character: 2.0.1
      micromark-util-html-tag-name: 2.0.1
      micromark-util-normalize-identifier: 2.0.1
      micromark-util-resolve-all: 2.0.1
      micromark-util-subtokenize: 2.1.0
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-extension-gfm-autolink-literal@2.1.0:
    dependencies:
      micromark-util-character: 2.1.1
      micromark-util-sanitize-uri: 2.0.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-extension-gfm-footnote@2.1.0:
    dependencies:
      devlop: 1.1.0
      micromark-core-commonmark: 2.0.3
      micromark-factory-space: 2.0.1
      micromark-util-character: 2.1.1
      micromark-util-normalize-identifier: 2.0.1
      micromark-util-sanitize-uri: 2.0.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-extension-gfm-strikethrough@2.1.0:
    dependencies:
      devlop: 1.1.0
      micromark-util-chunked: 2.0.1
      micromark-util-classify-character: 2.0.1
      micromark-util-resolve-all: 2.0.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-extension-gfm-table@2.1.1:
    dependencies:
      devlop: 1.1.0
      micromark-factory-space: 2.0.1
      micromark-util-character: 2.1.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-extension-gfm-tagfilter@2.0.0:
    dependencies:
      micromark-util-types: 2.0.2

  micromark-extension-gfm-task-list-item@2.1.0:
    dependencies:
      devlop: 1.1.0
      micromark-factory-space: 2.0.1
      micromark-util-character: 2.1.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-extension-gfm@3.0.0:
    dependencies:
      micromark-extension-gfm-autolink-literal: 2.1.0
      micromark-extension-gfm-footnote: 2.1.0
      micromark-extension-gfm-strikethrough: 2.1.0
      micromark-extension-gfm-table: 2.1.1
      micromark-extension-gfm-tagfilter: 2.0.0
      micromark-extension-gfm-task-list-item: 2.1.0
      micromark-util-combine-extensions: 2.0.1
      micromark-util-types: 2.0.2

  micromark-extension-math@3.1.0:
    dependencies:
      '@types/katex': 0.16.7
      devlop: 1.1.0
      katex: 0.16.25
      micromark-factory-space: 2.0.1
      micromark-util-character: 2.1.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-factory-destination@2.0.1:
    dependencies:
      micromark-util-character: 2.1.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-factory-label@2.0.1:
    dependencies:
      devlop: 1.1.0
      micromark-util-character: 2.1.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-factory-space@2.0.1:
    dependencies:
      micromark-util-character: 2.1.1
      micromark-util-types: 2.0.2

  micromark-factory-title@2.0.1:
    dependencies:
      micromark-factory-space: 2.0.1
      micromark-util-character: 2.1.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-factory-whitespace@2.0.1:
    dependencies:
      micromark-factory-space: 2.0.1
      micromark-util-character: 2.1.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-util-character@2.1.1:
    dependencies:
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-util-chunked@2.0.1:
    dependencies:
      micromark-util-symbol: 2.0.1

  micromark-util-classify-character@2.0.1:
    dependencies:
      micromark-util-character: 2.1.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-util-combine-extensions@2.0.1:
    dependencies:
      micromark-util-chunked: 2.0.1
      micromark-util-types: 2.0.2

  micromark-util-decode-numeric-character-reference@2.0.2:
    dependencies:
      micromark-util-symbol: 2.0.1

  micromark-util-decode-string@2.0.1:
    dependencies:
      decode-named-character-reference: 1.2.0
      micromark-util-character: 2.1.1
      micromark-util-decode-numeric-character-reference: 2.0.2
      micromark-util-symbol: 2.0.1

  micromark-util-encode@2.0.1: {}

  micromark-util-html-tag-name@2.0.1: {}

  micromark-util-normalize-identifier@2.0.1:
    dependencies:
      micromark-util-symbol: 2.0.1

  micromark-util-resolve-all@2.0.1:
    dependencies:
      micromark-util-types: 2.0.2

  micromark-util-sanitize-uri@2.0.1:
    dependencies:
      micromark-util-character: 2.1.1
      micromark-util-encode: 2.0.1
      micromark-util-symbol: 2.0.1

  micromark-util-subtokenize@2.1.0:
    dependencies:
      devlop: 1.1.0
      micromark-util-chunked: 2.0.1
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2

  micromark-util-symbol@2.0.1: {}

  micromark-util-types@2.0.2: {}

  micromark@4.0.2:
    dependencies:
      '@types/debug': 4.1.12
      debug: 4.4.3
      decode-named-character-reference: 1.2.0
      devlop: 1.1.0
      micromark-core-commonmark: 2.0.3
      micromark-factory-space: 2.0.1
      micromark-util-character: 2.1.1
      micromark-util-chunked: 2.0.1
      micromark-util-combine-extensions: 2.0.1
      micromark-util-decode-numeric-character-reference: 2.0.2
      micromark-util-encode: 2.0.1
      micromark-util-normalize-identifier: 2.0.1
      micromark-util-resolve-all: 2.0.1
      micromark-util-sanitize-uri: 2.0.1
      micromark-util-subtokenize: 2.1.0
      micromark-util-symbol: 2.0.1
      micromark-util-types: 2.0.2
    transitivePeerDependencies:
      - supports-color

  mime-db@1.52.0: {}

  mime-types@2.1.35:
    dependencies:
      mime-db: 1.52.0

  mime@1.6.0: {}

  minipass@7.1.2: {}

  minizlib@3.1.0:
    dependencies:
      minipass: 7.1.2

  mitt@3.0.1: {}

  mlly@1.8.0:
    dependencies:
      acorn: 8.15.0
      pathe: 2.0.3
      pkg-types: 1.3.1
      ufo: 1.6.1

  modern-screenshot@4.6.6: {}

  motion-dom@12.23.21:
    dependencies:
      motion-utils: 12.23.6

  motion-utils@12.23.6: {}

  ms@2.0.0: {}

  ms@2.1.3: {}

  mysql2@3.23.4(@types/node@24.7.0):
    dependencies:
      '@types/node': 24.7.0
      aws-ssl-profiles: 1.1.2
      generate-function: 2.3.1
      iconv-lite: 0.7.3
      long: 5.3.2
      lru.min: 1.1.4
      named-placeholders: 1.1.6
      sql-escaper: 1.5.1

  named-placeholders@1.1.6:
    dependencies:
      lru.min: 1.1.4

  nanoid@3.3.11: {}

  nanoid@5.1.6: {}

  negotiator@0.6.3: {}

  next-themes@0.4.6(react-dom@19.2.1(react@19.2.1))(react@19.2.1):
    dependencies:
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)

  node-releases@2.0.23: {}

  normalize-range@0.1.2: {}

  object-assign@4.1.1: {}

  object-inspect@1.13.4: {}

  on-finished@2.4.1:
    dependencies:
      ee-first: 1.1.1

  oniguruma-parser@0.12.1: {}

  oniguruma-to-es@4.3.3:
    dependencies:
      oniguruma-parser: 0.12.1
      regex: 6.0.1
      regex-recursion: 6.0.2

  package-manager-detector@1.5.0: {}

  pako@1.0.11: {}

  parse-entities@4.0.2:
    dependencies:
      '@types/unist': 2.0.11
      character-entities-legacy: 3.0.0
      character-reference-invalid: 2.0.1
      decode-named-character-reference: 1.2.0
      is-alphanumerical: 2.0.1
      is-decimal: 2.0.1
      is-hexadecimal: 2.0.1

  parse5@7.3.0:
    dependencies:
      entities: 6.0.1

  parseurl@1.3.3: {}

  path-data-parser@0.1.0: {}

  path-to-regexp@0.1.12: {}

  pathe@1.1.2: {}

  pathe@2.0.3: {}

  pathval@2.0.1: {}

  picocolors@1.1.1: {}

  picomatch@4.0.3: {}

  pkg-types@1.3.1:
    dependencies:
      confbox: 0.1.8
      mlly: 1.8.0
      pathe: 2.0.3

  pkg-types@2.3.0:
    dependencies:
      confbox: 0.2.2
      exsolve: 1.0.7
      pathe: 2.0.3

  playwright-core@1.62.1: {}

  pngjs@7.0.0: {}

  pnpm@10.18.1: {}

  points-on-curve@0.2.0: {}

  points-on-path@0.2.1:
    dependencies:
      path-data-parser: 0.1.0
      points-on-curve: 0.2.0

  postcss-selector-parser@6.0.10:
    dependencies:
      cssesc: 3.0.0
      util-deprecate: 1.0.2

  postcss-value-parser@4.2.0: {}

  postcss@8.5.6:
    dependencies:
      nanoid: 3.3.11
      picocolors: 1.1.1
      source-map-js: 1.2.1

  prettier@3.6.2: {}

  process-nextick-args@2.0.1: {}

  prop-types@15.8.1:
    dependencies:
      loose-envify: 1.4.0
      object-assign: 4.1.1
      react-is: 16.13.1

  property-information@6.5.0: {}

  property-information@7.1.0: {}

  proxy-addr@2.0.7:
    dependencies:
      forwarded: 0.2.0
      ipaddr.js: 1.9.1

  proxy-from-env@1.1.0: {}

  qs@6.13.0:
    dependencies:
      side-channel: 1.1.0

  quansync@0.2.11: {}

  range-parser@1.2.1: {}

  raw-body@2.5.2:
    dependencies:
      bytes: 3.1.2
      http-errors: 2.0.0
      iconv-lite: 0.4.24
      unpipe: 1.0.0

  react-day-picker@9.11.1(react@19.2.1):
    dependencies:
      '@date-fns/tz': 1.4.1
      date-fns: 4.1.0
      date-fns-jalali: 4.1.0-0
      react: 19.2.1

  react-dom@19.2.1(react@19.2.1):
    dependencies:
      react: 19.2.1
      scheduler: 0.27.0

  react-hook-form@7.64.0(react@19.2.1):
    dependencies:
      react: 19.2.1

  react-is@16.13.1: {}

  react-is@18.3.1: {}

  react-markdown@10.1.0(@types/react@19.2.1)(react@19.2.1):
    dependencies:
      '@types/hast': 3.0.4
      '@types/mdast': 4.0.4
      '@types/react': 19.2.1
      devlop: 1.1.0
      hast-util-to-jsx-runtime: 2.3.6
      html-url-attributes: 3.0.1
      mdast-util-to-hast: 13.2.0
      react: 19.2.1
      remark-parse: 11.0.0
      remark-rehype: 11.1.2
      unified: 11.0.5
      unist-util-visit: 5.0.0
      vfile: 6.0.3
    transitivePeerDependencies:
      - supports-color

  react-refresh@0.17.0: {}

  react-remove-scroll-bar@2.3.8(@types/react@19.2.1)(react@19.2.1):
    dependencies:
      react: 19.2.1
      react-style-singleton: 2.2.3(@types/react@19.2.1)(react@19.2.1)
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.2.1

  react-remove-scroll@2.7.1(@types/react@19.2.1)(react@19.2.1):
    dependencies:
      react: 19.2.1
      react-remove-scroll-bar: 2.3.8(@types/react@19.2.1)(react@19.2.1)
      react-style-singleton: 2.2.3(@types/react@19.2.1)(react@19.2.1)
      tslib: 2.8.1
      use-callback-ref: 1.3.3(@types/react@19.2.1)(react@19.2.1)
      use-sidecar: 1.1.3(@types/react@19.2.1)(react@19.2.1)
    optionalDependencies:
      '@types/react': 19.2.1

  react-resizable-panels@3.0.6(react-dom@19.2.1(react@19.2.1))(react@19.2.1):
    dependencies:
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)

  react-smooth@4.0.4(react-dom@19.2.1(react@19.2.1))(react@19.2.1):
    dependencies:
      fast-equals: 5.3.2
      prop-types: 15.8.1
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
      react-transition-group: 4.4.5(react-dom@19.2.1(react@19.2.1))(react@19.2.1)

  react-style-singleton@2.2.3(@types/react@19.2.1)(react@19.2.1):
    dependencies:
      get-nonce: 1.0.1
      react: 19.2.1
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.2.1

  react-transition-group@4.4.5(react-dom@19.2.1(react@19.2.1))(react@19.2.1):
    dependencies:
      '@babel/runtime': 7.28.4
      dom-helpers: 5.2.1
      loose-envify: 1.4.0
      prop-types: 15.8.1
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)

  react@19.2.1: {}

  readable-stream@2.3.8:
    dependencies:
      core-util-is: 1.0.3
      inherits: 2.0.4
      isarray: 1.0.0
      process-nextick-args: 2.0.1
      safe-buffer: 5.1.2
      string_decoder: 1.1.1
      util-deprecate: 1.0.2

  recharts-scale@0.4.5:
    dependencies:
      decimal.js-light: 2.5.1

  recharts@2.15.4(react-dom@19.2.1(react@19.2.1))(react@19.2.1):
    dependencies:
      clsx: 2.1.1
      eventemitter3: 4.0.7
      lodash: 4.17.21
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
      react-is: 18.3.1
      react-smooth: 4.0.4(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      recharts-scale: 0.4.5
      tiny-invariant: 1.3.3
      victory-vendor: 36.9.2

  regex-recursion@6.0.2:
    dependencies:
      regex-utilities: 2.3.0

  regex-utilities@2.3.0: {}

  regex@6.0.1:
    dependencies:
      regex-utilities: 2.3.0

  regexparam@3.0.0: {}

  rehype-harden@1.1.5: {}

  rehype-katex@7.0.1:
    dependencies:
      '@types/hast': 3.0.4
      '@types/katex': 0.16.7
      hast-util-from-html-isomorphic: 2.0.0
      hast-util-to-text: 4.0.2
      katex: 0.16.25
      unist-util-visit-parents: 6.0.2
      vfile: 6.0.3

  rehype-raw@7.0.0:
    dependencies:
      '@types/hast': 3.0.4
      hast-util-raw: 9.1.0
      vfile: 6.0.3

  remark-gfm@4.0.1:
    dependencies:
      '@types/mdast': 4.0.4
      mdast-util-gfm: 3.1.0
      micromark-extension-gfm: 3.0.0
      remark-parse: 11.0.0
      remark-stringify: 11.0.0
      unified: 11.0.5
    transitivePeerDependencies:
      - supports-color

  remark-math@6.0.0:
    dependencies:
      '@types/mdast': 4.0.4
      mdast-util-math: 3.0.0
      micromark-extension-math: 3.1.0
      unified: 11.0.5
    transitivePeerDependencies:
      - supports-color

  remark-parse@11.0.0:
    dependencies:
      '@types/mdast': 4.0.4
      mdast-util-from-markdown: 2.0.2
      micromark-util-types: 2.0.2
      unified: 11.0.5
    transitivePeerDependencies:
      - supports-color

  remark-rehype@11.1.2:
    dependencies:
      '@types/hast': 3.0.4
      '@types/mdast': 4.0.4
      mdast-util-to-hast: 13.2.0
      unified: 11.0.5
      vfile: 6.0.3

  remark-stringify@11.0.0:
    dependencies:
      '@types/mdast': 4.0.4
      mdast-util-to-markdown: 2.1.2
      unified: 11.0.5

  resolve-pkg-maps@1.0.0: {}

  robust-predicates@3.0.2: {}

  rollup@4.52.4:
    dependencies:
      '@types/estree': 1.0.8
    optionalDependencies:
      '@rollup/rollup-android-arm-eabi': 4.52.4
      '@rollup/rollup-android-arm64': 4.52.4
      '@rollup/rollup-darwin-arm64': 4.52.4
      '@rollup/rollup-darwin-x64': 4.52.4
      '@rollup/rollup-freebsd-arm64': 4.52.4
      '@rollup/rollup-freebsd-x64': 4.52.4
      '@rollup/rollup-linux-arm-gnueabihf': 4.52.4
      '@rollup/rollup-linux-arm-musleabihf': 4.52.4
      '@rollup/rollup-linux-arm64-gnu': 4.52.4
      '@rollup/rollup-linux-arm64-musl': 4.52.4
      '@rollup/rollup-linux-loong64-gnu': 4.52.4
      '@rollup/rollup-linux-ppc64-gnu': 4.52.4
      '@rollup/rollup-linux-riscv64-gnu': 4.52.4
      '@rollup/rollup-linux-riscv64-musl': 4.52.4
      '@rollup/rollup-linux-s390x-gnu': 4.52.4
      '@rollup/rollup-linux-x64-gnu': 4.52.4
      '@rollup/rollup-linux-x64-musl': 4.52.4
      '@rollup/rollup-openharmony-arm64': 4.52.4
      '@rollup/rollup-win32-arm64-msvc': 4.52.4
      '@rollup/rollup-win32-ia32-msvc': 4.52.4
      '@rollup/rollup-win32-x64-gnu': 4.52.4
      '@rollup/rollup-win32-x64-msvc': 4.52.4
      fsevents: 2.3.3

  roughjs@4.6.6:
    dependencies:
      hachure-fill: 0.5.2
      path-data-parser: 0.1.0
      points-on-curve: 0.2.0
      points-on-path: 0.2.1

  rw@1.3.3: {}

  safe-buffer@5.1.2: {}

  safe-buffer@5.2.1: {}

  safer-buffer@2.1.2: {}

  scheduler@0.27.0: {}

  semver@6.3.1: {}

  semver@7.8.5: {}

  send@0.19.0:
    dependencies:
      debug: 2.6.9
      depd: 2.0.0
      destroy: 1.2.0
      encodeurl: 1.0.2
      escape-html: 1.0.3
      etag: 1.8.1
      fresh: 0.5.2
      http-errors: 2.0.0
      mime: 1.6.0
      ms: 2.1.3
      on-finished: 2.4.1
      range-parser: 1.2.1
      statuses: 2.0.1
    transitivePeerDependencies:
      - supports-color

  serve-static@1.16.2:
    dependencies:
      encodeurl: 2.0.0
      escape-html: 1.0.3
      parseurl: 1.3.3
      send: 0.19.0
    transitivePeerDependencies:
      - supports-color

  setimmediate@1.0.5: {}

  setprototypeof@1.2.0: {}

  sharp@0.35.3(@types/node@24.7.0):
    dependencies:
      '@img/colour': 1.1.0
      detect-libc: 2.1.2
      semver: 7.8.5
    optionalDependencies:
      '@img/sharp-darwin-arm64': 0.35.3
      '@img/sharp-darwin-x64': 0.35.3
      '@img/sharp-freebsd-wasm32': 0.35.3
      '@img/sharp-libvips-darwin-arm64': 1.3.2
      '@img/sharp-libvips-darwin-x64': 1.3.2
      '@img/sharp-libvips-linux-arm': 1.3.2
      '@img/sharp-libvips-linux-arm64': 1.3.2
      '@img/sharp-libvips-linux-ppc64': 1.3.2
      '@img/sharp-libvips-linux-riscv64': 1.3.2
      '@img/sharp-libvips-linux-s390x': 1.3.2
      '@img/sharp-libvips-linux-x64': 1.3.2
      '@img/sharp-libvips-linuxmusl-arm64': 1.3.2
      '@img/sharp-libvips-linuxmusl-x64': 1.3.2
      '@img/sharp-linux-arm': 0.35.3
      '@img/sharp-linux-arm64': 0.35.3
      '@img/sharp-linux-ppc64': 0.35.3
      '@img/sharp-linux-riscv64': 0.35.3
      '@img/sharp-linux-s390x': 0.35.3
      '@img/sharp-linux-x64': 0.35.3
      '@img/sharp-linuxmusl-arm64': 0.35.3
      '@img/sharp-linuxmusl-x64': 0.35.3
      '@img/sharp-webcontainers-wasm32': 0.35.3
      '@img/sharp-win32-arm64': 0.35.3
      '@img/sharp-win32-ia32': 0.35.3
      '@img/sharp-win32-x64': 0.35.3
      '@types/node': 24.7.0

  shiki@3.14.0:
    dependencies:
      '@shikijs/core': 3.14.0
      '@shikijs/engine-javascript': 3.14.0
      '@shikijs/engine-oniguruma': 3.14.0
      '@shikijs/langs': 3.14.0
      '@shikijs/themes': 3.14.0
      '@shikijs/types': 3.14.0
      '@shikijs/vscode-textmate': 10.0.2
      '@types/hast': 3.0.4

  side-channel-list@1.0.0:
    dependencies:
      es-errors: 1.3.0
      object-inspect: 1.13.4

  side-channel-map@1.0.1:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      get-intrinsic: 1.3.0
      object-inspect: 1.13.4

  side-channel-weakmap@1.0.2:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      get-intrinsic: 1.3.0
      object-inspect: 1.13.4
      side-channel-map: 1.0.1

  side-channel@1.1.0:
    dependencies:
      es-errors: 1.3.0
      object-inspect: 1.13.4
      side-channel-list: 1.0.0
      side-channel-map: 1.0.1
      side-channel-weakmap: 1.0.2

  siginfo@2.0.0: {}

  sonner@2.0.7(react-dom@19.2.1(react@19.2.1))(react@19.2.1):
    dependencies:
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)

  source-map-js@1.2.1: {}

  source-map-support@0.5.21:
    dependencies:
      buffer-from: 1.1.2
      source-map: 0.6.1

  source-map@0.6.1: {}

  space-separated-tokens@2.0.2: {}

  sql-escaper@1.5.1: {}

  stackback@0.0.2: {}

  statuses@2.0.1: {}

  std-env@3.9.0: {}

  streamdown@1.4.0(@types/react@19.2.1)(react@19.2.1):
    dependencies:
      clsx: 2.1.1
      katex: 0.16.25
      lucide-react: 0.542.0(react@19.2.1)
      marked: 16.4.1
      mermaid: 11.12.0
      react: 19.2.1
      react-markdown: 10.1.0(@types/react@19.2.1)(react@19.2.1)
      rehype-harden: 1.1.5
      rehype-katex: 7.0.1
      rehype-raw: 7.0.0
      remark-gfm: 4.0.1
      remark-math: 6.0.0
      shiki: 3.14.0
      tailwind-merge: 3.3.1
    transitivePeerDependencies:
      - '@types/react'
      - supports-color

  string_decoder@1.1.1:
    dependencies:
      safe-buffer: 5.1.2

  stringify-entities@4.0.4:
    dependencies:
      character-entities-html4: 2.1.0
      character-entities-legacy: 3.0.0

  style-to-js@1.1.18:
    dependencies:
      style-to-object: 1.0.11

  style-to-object@1.0.11:
    dependencies:
      inline-style-parser: 0.2.4

  stylis@4.3.6: {}

  superjson@1.13.3:
    dependencies:
      copy-anything: 3.0.5

  tailwind-merge@3.3.1: {}

  tailwindcss-animate@1.0.7(tailwindcss@4.1.14):
    dependencies:
      tailwindcss: 4.1.14

  tailwindcss@4.1.14: {}

  tapable@2.3.0: {}

  tar@7.5.1:
    dependencies:
      '@isaacs/fs-minipass': 4.0.1
      chownr: 3.0.0
      minipass: 7.1.2
      minizlib: 3.1.0
      yallist: 5.0.0

  tiny-invariant@1.3.3: {}

  tinybench@2.9.0: {}

  tinyexec@0.3.2: {}

  tinyexec@1.0.1: {}

  tinyglobby@0.2.15:
    dependencies:
      fdir: 6.5.0(picomatch@4.0.3)
      picomatch: 4.0.3

  tinypool@1.1.1: {}

  tinyrainbow@1.2.0: {}

  tinyspy@3.0.2: {}

  toidentifier@1.0.1: {}

  trim-lines@3.0.1: {}

  trough@2.2.0: {}

  ts-dedent@2.2.0: {}

  tslib@2.8.1: {}

  tsx@4.20.6:
    dependencies:
      esbuild: 0.25.10
      get-tsconfig: 4.12.0
    optionalDependencies:
      fsevents: 2.3.3

  tsx@4.23.12:
    dependencies:
      esbuild: 0.28.2
    optionalDependencies:
      fsevents: 2.3.3

  tw-animate-css@1.4.0: {}

  type-is@1.6.18:
    dependencies:
      media-typer: 0.3.0
      mime-types: 2.1.35

  typescript@5.9.3: {}

  ufo@1.6.1: {}

  undici-types@7.14.0: {}

  unified@11.0.5:
    dependencies:
      '@types/unist': 3.0.3
      bail: 2.0.2
      devlop: 1.1.0
      extend: 3.0.2
      is-plain-obj: 4.1.0
      trough: 2.2.0
      vfile: 6.0.3

  unist-util-find-after@5.0.0:
    dependencies:
      '@types/unist': 3.0.3
      unist-util-is: 6.0.1

  unist-util-is@6.0.1:
    dependencies:
      '@types/unist': 3.0.3

  unist-util-position@5.0.0:
    dependencies:
      '@types/unist': 3.0.3

  unist-util-remove-position@5.0.0:
    dependencies:
      '@types/unist': 3.0.3
      unist-util-visit: 5.0.0

  unist-util-stringify-position@4.0.0:
    dependencies:
      '@types/unist': 3.0.3

  unist-util-visit-parents@6.0.2:
    dependencies:
      '@types/unist': 3.0.3
      unist-util-is: 6.0.1

  unist-util-visit@5.0.0:
    dependencies:
      '@types/unist': 3.0.3
      unist-util-is: 6.0.1
      unist-util-visit-parents: 6.0.2

  unpipe@1.0.0: {}

  update-browserslist-db@1.1.3(browserslist@4.26.3):
    dependencies:
      browserslist: 4.26.3
      escalade: 3.2.0
      picocolors: 1.1.1

  use-callback-ref@1.3.3(@types/react@19.2.1)(react@19.2.1):
    dependencies:
      react: 19.2.1
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.2.1

  use-sidecar@1.1.3(@types/react@19.2.1)(react@19.2.1):
    dependencies:
      detect-node-es: 1.1.0
      react: 19.2.1
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.2.1

  use-sync-external-store@1.6.0(react@19.2.1):
    dependencies:
      react: 19.2.1

  util-deprecate@1.0.2: {}

  utils-merge@1.0.1: {}

  uuid@11.1.0: {}

  vary@1.1.2: {}

  vaul@1.1.2(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1):
    dependencies:
      '@radix-ui/react-dialog': 1.1.15(@types/react-dom@19.2.1(@types/react@19.2.1))(@types/react@19.2.1)(react-dom@19.2.1(react@19.2.1))(react@19.2.1)
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
    transitivePeerDependencies:
      - '@types/react'
      - '@types/react-dom'

  vfile-location@5.0.3:
    dependencies:
      '@types/unist': 3.0.3
      vfile: 6.0.3

  vfile-message@4.0.3:
    dependencies:
      '@types/unist': 3.0.3
      unist-util-stringify-position: 4.0.0

  vfile@6.0.3:
    dependencies:
      '@types/unist': 3.0.3
      vfile-message: 4.0.3

  victory-vendor@36.9.2:
    dependencies:
      '@types/d3-array': 3.2.2
      '@types/d3-ease': 3.0.2
      '@types/d3-interpolate': 3.0.4
      '@types/d3-scale': 4.0.9
      '@types/d3-shape': 3.1.7
      '@types/d3-time': 3.0.4
      '@types/d3-timer': 3.0.2
      d3-array: 3.2.4
      d3-ease: 3.0.1
      d3-interpolate: 3.0.1
      d3-scale: 4.0.2
      d3-shape: 3.2.0
      d3-time: 3.1.0
      d3-timer: 3.0.1

  vite-node@2.1.9(@types/node@24.7.0)(lightningcss@1.30.1):
    dependencies:
      cac: 6.7.14
      debug: 4.4.3
      es-module-lexer: 1.7.0
      pathe: 1.1.2
      vite: 5.4.20(@types/node@24.7.0)(lightningcss@1.30.1)
    transitivePeerDependencies:
      - '@types/node'
      - less
      - lightningcss
      - sass
      - sass-embedded
      - stylus
      - sugarss
      - supports-color
      - terser

  vite-plugin-manus-runtime@0.0.59:
    dependencies:
      '@medv/finder': 4.0.2
      clsx: 2.1.1
      modern-screenshot: 4.6.6
      nanoid: 5.1.6
      react: 19.2.1
      react-dom: 19.2.1(react@19.2.1)
      tailwind-merge: 3.3.1

  vite@5.4.20(@types/node@24.7.0)(lightningcss@1.30.1):
    dependencies:
      esbuild: 0.21.5
      postcss: 8.5.6
      rollup: 4.52.4
    optionalDependencies:
      '@types/node': 24.7.0
      fsevents: 2.3.3
      lightningcss: 1.30.1

  vite@7.1.9(@types/node@24.7.0)(jiti@2.6.1)(lightningcss@1.30.1)(tsx@4.20.6):
    dependencies:
      esbuild: 0.25.10
      fdir: 6.5.0(picomatch@4.0.3)
      picomatch: 4.0.3
      postcss: 8.5.6
      rollup: 4.52.4
      tinyglobby: 0.2.15
    optionalDependencies:
      '@types/node': 24.7.0
      fsevents: 2.3.3
      jiti: 2.6.1
      lightningcss: 1.30.1
      tsx: 4.20.6

  vitest@2.1.9(@types/node@24.7.0)(lightningcss@1.30.1):
    dependencies:
      '@vitest/expect': 2.1.9
      '@vitest/mocker': 2.1.9(vite@5.4.20(@types/node@24.7.0)(lightningcss@1.30.1))
      '@vitest/pretty-format': 2.1.9
      '@vitest/runner': 2.1.9
      '@vitest/snapshot': 2.1.9
      '@vitest/spy': 2.1.9
      '@vitest/utils': 2.1.9
      chai: 5.3.3
      debug: 4.4.3
      expect-type: 1.2.2
      magic-string: 0.30.19
      pathe: 1.1.2
      std-env: 3.9.0
      tinybench: 2.9.0
      tinyexec: 0.3.2
      tinypool: 1.1.1
      tinyrainbow: 1.2.0
      vite: 5.4.20(@types/node@24.7.0)(lightningcss@1.30.1)
      vite-node: 2.1.9(@types/node@24.7.0)(lightningcss@1.30.1)
      why-is-node-running: 2.3.0
    optionalDependencies:
      '@types/node': 24.7.0
    transitivePeerDependencies:
      - less
      - lightningcss
      - msw
      - sass
      - sass-embedded
      - stylus
      - sugarss
      - supports-color
      - terser

  vscode-jsonrpc@8.2.0: {}

  vscode-languageserver-protocol@3.17.5:
    dependencies:
      vscode-jsonrpc: 8.2.0
      vscode-languageserver-types: 3.17.5

  vscode-languageserver-textdocument@1.0.12: {}

  vscode-languageserver-types@3.17.5: {}

  vscode-languageserver@9.0.1:
    dependencies:
      vscode-languageserver-protocol: 3.17.5

  vscode-uri@3.0.8: {}

  web-namespaces@2.0.1: {}

  why-is-node-running@2.3.0:
    dependencies:
      siginfo: 2.0.0
      stackback: 0.0.2

  wouter@3.7.1(patch_hash=4e16e6ff3fde7d6c1024d3e0c8605dc9eb6afb690d0d49958c2f449091813072)(react@19.2.1):
    dependencies:
      mitt: 3.0.1
      react: 19.2.1
      regexparam: 3.0.0
      use-sync-external-store: 1.6.0(react@19.2.1)

  yallist@3.1.1: {}

  yallist@5.0.0: {}

  zod@4.1.12: {}

  zwitch@2.0.4: {}

````

### `scripts/check-heic-sharp.mjs`

````javascript
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';

const root = '/home/ubuntu/upload';
const files = (await readdir(root)).filter((name) => /^100002786[5-9]\.heic$/i.test(name));

for (const name of files) {
  try {
    const metadata = await sharp(`${root}/${name}`).metadata();
    console.log(JSON.stringify({ name, ok: true, format: metadata.format, width: metadata.width, height: metadata.height }));
  } catch (error) {
    console.log(JSON.stringify({ name, ok: false, error: error instanceof Error ? error.message : String(error) }));
  }
}

````

### `scripts/convert-heic-inputs.py`

````python
from pathlib import Path
from pillow_heif import register_heif_opener
from PIL import Image

register_heif_opener()
source = Path('/home/ubuntu/upload')
target = Path('/home/ubuntu/webdev-static-assets/sticker-inputs')
target.mkdir(parents=True, exist_ok=True)
for path in sorted(source.glob('*.heic')):
    with Image.open(path) as image:
        rgb = image.convert('RGB')
        output = target / f'{path.stem}.jpg'
        rgb.save(output, quality=94, optimize=True)
        print(f'{path.name} -> {output.name} {rgb.size}')

````

### `scripts/convert-heic-verification.py`

````python
from pathlib import Path
from PIL import Image
import pillow_heif

pillow_heif.register_heif_opener()
source = Path('/home/ubuntu/upload')
target = Path('/tmp/sticker-heic-verification')
target.mkdir(exist_ok=True)

for heic in sorted(source.glob('100002786[5-9].heic')):
    image = Image.open(heic).convert('RGB')
    output = target / f'{heic.stem}.jpg'
    image.save(output, 'JPEG', quality=92, optimize=True)
    print(output)

````

### `scripts/download-generated-results.py`

````python
import json
from pathlib import Path
import requests

manifest_path = Path('/home/ubuntu/sticker-tycoon-replica/generated-10-stickers.json')
out_dir = Path('/home/ubuntu/sticker-tycoon-replica/generated-stickers')
out_dir.mkdir(exist_ok=True)
data = json.loads(manifest_path.read_text())
base = 'http://localhost:3000'
for item in data['results']:
    if not item.get('url'):
        continue
    response = requests.get(base + item['url'], allow_redirects=True, timeout=60)
    response.raise_for_status()
    target = out_dir / f"{item['position']:02d}-{item['phrase']}.png"
    target.write_bytes(response.content)
    print(target, len(response.content))

````

### `scripts/extract-line-reference.mjs`

````javascript
import { readFileSync, writeFileSync } from "node:fs";

const input = "/tmp/manus-mcp/mcp_result_4300aee1-d837-463d-a865-583a93954fd3.json";
const output = "/home/ubuntu/sticker-tycoon-replica/reference-line-features.txt";
const lines = readFileSync(input, "utf8").split(/\r?\n/).filter(Boolean);
const out = [];
for (const line of lines) {
  try {
    const item = JSON.parse(line);
    if (item.type === "chat" && item.content) out.push(`[CHAT] ${item.content}`);
    if (item.type === "explanation" && item.content) out.push(`[PROGRESS] ${item.content}`);
    if (item.type === "toolUsed" && item.description) out.push(`[TOOL] ${item.tool ?? "unknown"}: ${item.description}`);
    if (item.type === "chat" && Array.isArray(item.attachments)) {
      for (const attachment of item.attachments) {
        if (attachment.filename || attachment.contentType) out.push(`[ASSET] ${attachment.filename ?? "unnamed"} (${attachment.contentType ?? "unknown"})`);
      }
    }
  } catch {}
}
writeFileSync(output, out.join("\n") + "\n");
console.log(`Wrote ${out.length} extracted records to ${output}`);

````

### `scripts/generate-ten-stickers.mjs`

````javascript
import { writeFileSync } from "node:fs";
import { appRouter } from "../server/routers.ts";

const ctx = { user: null, req: { protocol: "https", headers: {} }, res: { clearCookie() {} } };
const caller = appRouter.createCaller(ctx);
const referenceUrls = [
  "/manus-storage/1000027555_64d55c91.jpg",
  "/manus-storage/1000027557_f8da6ae6.jpg",
  "/manus-storage/1000027558_90ed979a.jpg",
  "/manus-storage/1000027559_2b5bc670.jpg",
  "/manus-storage/1000027691_f4580032.jpg",
  "/manus-storage/1000027865_60991973.jpg",
  "/manus-storage/1000027866_cd154718.jpg",
  "/manus-storage/1000027867_bd7a8d96.jpg",
  "/manus-storage/1000027868_db10ac35.jpg",
  "/manus-storage/1000027869_a1abfd98.jpg",
];
const phrases = [
  ["早安", "開心揮手打招呼，晨光與小星星"],
  ["謝謝", "雙手合十，溫暖微笑"],
  ["收到", "俐落點頭或敬禮，表示已收到"],
  ["加油", "握拳鼓勵，充滿活力"],
  ["等等我", "小跑步揮手，帶一點急迫感"],
  ["好累喔", "慵懶趴下，眼神疲憊但可愛"],
  ["太好了", "開心跳起來，周圍有彩色星星"],
  ["不要啦", "搖手拒絕，表情撒嬌"],
  ["晚安", "抱著枕頭打呵欠，月亮與星星"],
  ["掰掰", "揮手道別，笑容可愛"],
].map(([phrase, scene], index) => ({ position: index + 1, emotion: phrase, phrase, scene }));

console.log("Generating 10 independent cartoon stickers from 10 reference photos...");
const results = await caller.creative.generateBatch({
  photoDataUrl: referenceUrls[0],
  referenceUrls,
  style: "可愛手繪卡通",
  characterProfile: "嚴格保留 10 張照片中的角色外觀、臉型、毛色、花紋與辨識特徵；把它們視為同一個角色組，所有貼圖維持一致的卡通化比例與線條風格。",
  items: phrases,
});
writeFileSync("/home/ubuntu/sticker-tycoon-replica/generated-10-stickers.json", JSON.stringify({ referenceUrls, results }, null, 2));
for (const item of results) console.log(`${String(item.position).padStart(2, "0")} ${item.phrase} -> ${item.url || item.error}`);
const successful = results.filter((item) => item.url).length;
const failed = results.length - successful;
console.log(`GENERATED_SUMMARY success=${successful} failed=${failed}`);
if (failed > 0) process.exitCode = 2;

````

### `scripts/inspect-image-output.mjs`

````javascript
import { generateImage } from "../server/_core/imageGeneration.ts";
const result = await generateImage({
  prompt: "Remove the background from the supplied character photo and preserve the character exactly.",
  originalImages: [{ url: "/manus-storage/sticker-tycoon-hero-reference_07193460.png", mimeType: "image/png" }],
  quality: "high",
});
console.log(JSON.stringify({ url: result.url, mimeType: result.mimeType, hasAlpha: result.hasAlpha, b64Length: result.b64Json?.length }, null, 2));

````

### `scripts/make-sticker-contact-sheet.py`

````python
from pathlib import Path
from PIL import Image, ImageDraw

source = Path('/home/ubuntu/sticker-tycoon-replica/generated-stickers')
files = sorted(source.glob('*.png'))
thumb_size = 320
margin = 24
cols = 3
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (thumb_size + margin) + margin, rows * (thumb_size + 70 + margin) + margin), '#07182d')
draw = ImageDraw.Draw(sheet)
for index, path in enumerate(files):
    image = Image.open(path).convert('RGBA')
    image.thumbnail((thumb_size, thumb_size))
    x = margin + (index % cols) * (thumb_size + margin)
    y = margin + (index // cols) * (thumb_size + 70 + margin)
    tile = Image.new('RGBA', (thumb_size, thumb_size), '#102b47')
    tile.alpha_composite(image, ((thumb_size - image.width) // 2, (thumb_size - image.height) // 2))
    sheet.paste(tile.convert('RGB'), (x, y))
    draw.text((x, y + thumb_size + 14), path.stem, fill='#dcecff')
sheet.save('/home/ubuntu/sticker-tycoon-replica/generated-stickers-contact-sheet.jpg', quality=92)

````

### `scripts/verify-ai-flow.mjs`

````javascript
import { appRouter } from "../server/routers.ts";

const ctx = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: { clearCookie() {} },
};

const caller = appRouter.createCaller(ctx);
const source = "/manus-storage/sticker-tycoon-hero-reference_07193460.png";

console.log("[1/3] AI semantic cutout");
const cutout = await caller.creative.removeBackground({ photoDataUrl: source });
if (!cutout.url || cutout.mode !== "cutout") throw new Error("cutout did not return a stored image");
console.log("cutout", cutout.url);

console.log("[2/3] Generate again from the cutout result");
const generated = await caller.creative.generate({ photoDataUrl: cutout.url, style: "可愛手繪", emotion: "開心", prompt: "讓角色揮手說早安" });
if (!generated.url || generated.mode !== "generate") throw new Error("generate did not return a stored image");
console.log("generated", generated.url);

console.log("[3/3] Multi-round refinement");
const refined = await caller.creative.refine({
  currentImageUrl: { url: generated.url, mimeType: "image/png" },
  instruction: "文字改成早安，表情更可愛",
  history: [{ role: "user", content: "請做一張可愛貼圖" }, { role: "assistant", content: "已完成初稿" }],
});
if (!refined.url || refined.mode !== "refine") throw new Error("refine did not return a stored image");
console.log("refined", refined.url);
console.log("AI_FLOW_OK");

````

### `scripts/verify-browser-heic-flow.mjs`

````javascript
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';

const baseUrl = 'http://localhost:3000';
const files = [
  '/home/ubuntu/upload/1000027865.heic',
  '/home/ubuntu/upload/1000027866.heic',
  '/home/ubuntu/upload/1000027867.heic',
  '/home/ubuntu/upload/1000027868.heic',
  '/home/ubuntu/upload/1000027869.heic',
];
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('#studio').scrollIntoViewIfNeeded();
  await page.getByLabel('貼圖張數').selectOption('4');
  await page.getByRole('button', { name: /讓 AI 規劃我的貼圖組/ }).click();
  await page.getByText('建立角色設定檔').waitFor({ timeout: 20_000 });

  await page.locator('input[type="file"]').setInputFiles('/tmp/oversize-reference.jpg');
  await page.getByText('檔案超過 12 MB').waitFor({ timeout: 10_000 });
  await page.locator('input[type="file"]').setInputFiles(files);
  await page.locator('.reference-thumb').nth(4).waitFor({ timeout: 90_000 });
  const referenceCount = await page.locator('.reference-thumb').count();
  const uploadErrorCount = await page.locator('.upload-errors li').count();
  if (referenceCount !== 5 || uploadErrorCount !== 0) throw new Error(`HEIC browser upload failed: references=${referenceCount} errors=${uploadErrorCount}`);

  await page.getByRole('button', { name: /建立角色與專案/ }).click();
  await page.getByText('編輯文字與情境腳本').waitFor({ timeout: 20_000 });
  const firstPhrase = await page.locator('.script-row input').nth(0).inputValue();
  const secondPhrase = await page.locator('.script-row input').nth(3).inputValue();
  await page.getByRole('button', { name: '腳本上移' }).nth(1).click();
  const reorderedFirstPhrase = await page.locator('.script-row input').nth(0).inputValue();
  if (reorderedFirstPhrase !== secondPhrase || firstPhrase === reorderedFirstPhrase) throw new Error('Script sorting did not reorder the visible rows');

  await page.getByRole('button', { name: /開始批次生成/ }).click();
  await page.locator('.batch-card').nth(3).waitFor({ timeout: 90_000 });
  const failedCards = await page.locator('.batch-failed').count();
  const zipVisible = await page.getByRole('button', { name: /匯出 ZIP/ }).count();
  if (failedCards !== 4 || zipVisible !== 0) throw new Error(`Batch quota guard failed: failedCards=${failedCards} zipVisible=${zipVisible}`);

  await page.locator('.batch-card').first().click();
  await page.locator('.chat-composer input').fill('把文字改成早安');
  await page.locator('.chat-composer').press('Enter');
  await page.getByText('這張貼圖尚未生成成功').waitFor({ timeout: 10_000 });

  const projectKeyText = await page.locator('.batch-summary .eyebrow').textContent();
  const projectKey = projectKeyText?.replace(/^專案\s+/, '').trim() || '';
  if (!projectKey) throw new Error('Could not read the created project key');

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('#studio').scrollIntoViewIfNeeded();
  await page.getByPlaceholder('已有專案代碼，例如：Ab3kL9mN2pQx').fill(projectKey);
  await page.getByRole('button', { name: '載入既有專案' }).click();
  await page.locator('.batch-failed').nth(3).waitFor({ timeout: 20_000 });
  const restoredFailedCards = await page.locator('.batch-failed').count();
  if (restoredFailedCards !== 4) throw new Error(`Project resume did not restore failed items: ${restoredFailedCards}`);

  await page.screenshot({ path: '/tmp/heic-browser-flow.png', fullPage: true });
  const result = { ok: true, referenceCount, uploadErrorCount, failedCards, zipVisible, projectKey, restoredFailedCards, consoleErrors };
  await writeFile('/home/ubuntu/sticker-tycoon-replica/browser-heic-flow-result.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}

````

### `scripts/verify-browser-successful-result-flow.mjs`

````javascript
import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';

const baseUrl = 'http://localhost:3000';
const projectKey = 'ui-success-export-check';
const manifest = JSON.parse(await readFile('/home/ubuntu/sticker-tycoon-replica/generated-10-stickers.json', 'utf8'));
const seededResults = manifest.results.filter((item) => item.url).slice(0, 4);
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));

try {
  await page.addInitScript(({ key, results }) => {
    window.localStorage.setItem('sticker-tycoon-project-key', key);
    window.localStorage.setItem(`sticker-tycoon-results-${key}`, JSON.stringify(results));
  }, { key: projectKey, results: seededResults });
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('.batch-card').nth(3).waitFor({ timeout: 25_000 });
  const firstPhrase = await page.locator('.batch-card-footer strong').first().textContent();
  const secondPhrase = await page.locator('.batch-card-footer strong').nth(1).textContent();
  await page.getByRole('button', { name: '貼圖下移' }).first().click();
  const reorderedFirstPhrase = await page.locator('.batch-card-footer strong').first().textContent();
  if (reorderedFirstPhrase !== secondPhrase || firstPhrase === reorderedFirstPhrase) throw new Error('Result sorting did not update UI order');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /匯出 ZIP/ }).click();
  const download = await downloadPromise;
  const zipPath = '/tmp/sticker-ui-export.zip';
  await download.saveAs(zipPath);

  await page.locator('.batch-card').first().click();
  const beforeRefine = await page.locator('.batch-image-wrap img').first().getAttribute('src');
  await page.locator('.chat-composer input').fill('把表情改得更開心');
  await page.locator('.chat-composer input').press('Enter');
  await page.locator('.chat-message.assistant p').filter({ hasText: /使用量已暫時耗盡|原本版本已保留/ }).last().waitFor({ timeout: 20_000 });
  const afterRefine = await page.locator('.batch-image-wrap img').first().getAttribute('src');
  if (beforeRefine !== afterRefine) throw new Error('Failed refine should preserve the original result');
  const notice = await page.locator('.toast').textContent();
  if (!notice?.includes('使用量已暫時耗盡') || notice.includes('修改完成')) throw new Error('Usage-exhausted refine should show a non-success fallback notice');
  if (consoleErrors.length) throw new Error(`Unexpected browser console errors: ${consoleErrors.join(' | ')}`);

  const result = { ok: true, firstPhrase, secondPhrase, reorderedFirstPhrase, zipPath, suggestedFilename: download.suggestedFilename(), consoleErrors };
  await writeFile('/home/ubuntu/sticker-tycoon-replica/browser-success-result-flow.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}

````

### `scripts/verify-heic-upload-flow.mjs`

````javascript
import { appRouter } from '../server/routers.ts';
import { readFile, readdir } from 'node:fs/promises';

const ctx = { user: null, req: { protocol: 'https', headers: {} }, res: { clearCookie() {} } };
const caller = appRouter.createCaller(ctx);
const directory = '/tmp/sticker-heic-verification';
const files = (await readdir(directory)).filter((name) => name.endsWith('.jpg')).sort();
const results = [];

for (const fileName of files) {
  try {
    const bytes = await readFile(`${directory}/${fileName}`);
    const photoDataUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`;
    const result = await caller.project.prepareReference({ photoDataUrl, fileName });
    results.push({ fileName, ok: true, url: result.url });
    console.log(`OK ${fileName} -> ${result.url}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ fileName, ok: false, error: message });
    console.log(`FAIL ${fileName} -> ${message}`);
  }
}

const failed = results.filter((item) => !item.ok);
console.log(`HEIC_UPLOAD_SUMMARY success=${results.length - failed.length} failed=${failed.length}`);
if (failed.length) process.exitCode = 2;


````

### `scripts/verify-project-workflow.mjs`

````javascript
import { appRouter } from '../server/routers.ts';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const ctx = { user: null, req: { protocol: 'https', headers: {} }, res: { clearCookie() {} } };
const caller = appRouter.createCaller(ctx);
const directory = '/tmp/sticker-heic-verification';
const files = (await readdir(directory)).filter((name) => name.endsWith('.jpg')).sort();
const references = [];

for (const [sortOrder, fileName] of files.entries()) {
  const bytes = await readFile(`${directory}/${fileName}`);
  const photoDataUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  const prepared = await caller.project.prepareReference({ photoDataUrl, fileName });
  references.push({ url: prepared.url, fileName: prepared.fileName, sortOrder });
}

const plan = await caller.project.plan({
  brief: '使用五張角色照片製作實用的繁體中文卡通貼圖。',
  style: '可愛手繪',
  stickerCount: 4,
  characterProfile: '保留照片中的角色外觀、五官與辨識特徵。',
});
const scripts = plan.scripts.slice(0, 4);
const project = await caller.project.create({
  title: `${plan.title || 'HEIC 診斷'}（系統驗證）`,
  brief: 'HEIC 多檔上傳與網站流程驗證。',
  style: '可愛手繪',
  stickerCount: 4,
  characterProfile: plan.characterProfile,
  references,
  scripts,
});
const loaded = await caller.project.get({ projectKey: project.projectKey });
if (!loaded || loaded.references.length !== references.length || loaded.scripts.length !== scripts.length) throw new Error('專案建立或載入資料不完整');

const quality = await caller.creative.qualityCheck({ url: references[0].url, phrase: scripts[0].phrase });
const zip = await caller.creative.exportZip({ files: references.slice(0, 2).map((item, index) => ({ url: item.url, fileName: `diagnostic-${index + 1}.jpg` })) });
if (!zip.base64 || !zip.fileName.endsWith('.zip')) throw new Error('ZIP 匯出未回傳有效內容');

const batch = await caller.creative.generateBatch({
  projectKey: project.projectKey,
  photoDataUrl: references[0].url,
  referenceUrls: references.map((item) => item.url),
  style: '可愛手繪',
  characterProfile: plan.characterProfile,
  items: scripts.slice(0, 1),
});
const restored = await caller.project.get({ projectKey: project.projectKey });
const result = {
  projectKey: project.projectKey,
  uploaded: references.length,
  scripts: scripts.length,
  quality,
  zipBytes: Buffer.from(zip.base64, 'base64').length,
  batch,
  restoredScript: restored?.scripts[0],
};
await writeFile('/home/ubuntu/sticker-tycoon-replica/workflow-diagnostic-result.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

````

### `server/_core/context.ts`

````typescript
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

````

### `server/_core/cookies.ts`

````typescript
import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}

````

### `server/_core/dataApi.ts`

````typescript
/**
 * Quick example (matches curl usage):
 *   await callDataApi("Youtube/search", {
 *     query: { gl: "US", hl: "en", q: "manus" },
 *   })
 */
import { ENV } from "./env";

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  apiId: string,
  options: DataApiCallOptions = {}
): Promise<unknown> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  // Build the full URL by appending the service path to the base URL
  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("webdevtoken.v1.WebDevService/CallApi", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      apiId,
      query: options.query,
      body: options.body,
      path_params: options.pathParams,
      multipart_form_data: options.formData,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Data API request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (payload && typeof payload === "object" && "jsonData" in payload) {
    try {
      return JSON.parse((payload as Record<string, string>).jsonData ?? "{}");
    } catch {
      return (payload as Record<string, unknown>).jsonData;
    }
  }
  return payload;
}

````

### `server/_core/env.ts`

````typescript
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

````

### `server/_core/heartbeat.ts`

````typescript
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type HeartbeatJob = {
  name: string;
  /**
   * 6-field cron with seconds (`sec min hour dom mon dow`), UTC, min interval 60s.
   * Use `0` for the seconds field — e.g. `"0 0 9 * * *"` is daily 09:00 UTC.
   * See /home/ubuntu/skills/webdev-periodic-updates/SKILL.md.
   */
  cron: string;
  /** Callback path. MUST start with `/api/scheduled/`. */
  path: string;
  method?: "POST" | "PUT";
  payload?: unknown;
  description?: string;
};

/**
 * Update patch. All fields optional; unset = leave unchanged.
 * `enable`: true = resume, false = pause; omit = unchanged.
 * `name` is the (project, owner)-scope key and cannot be changed.
 */
export type HeartbeatJobUpdate = Partial<Omit<HeartbeatJob, "name">> & {
  enable?: boolean;
};

export type HeartbeatJobInfo = {
  taskUid: string;
  name: string;
  userId: string;
  description: string;
  cronExpression: string;
  callbackPath: string;
  callbackMethod: string;
  callbackPayload: string;
  isEnable: boolean;
  createdAt?: string | null;
  lastExecutedAt?: string | null;
  nextExecutionAt?: string | null;
};

const SERVICE = "webdevtoken.v1.WebDevService";

const buildEndpoint = (rpc: string): string => {
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service URL is not configured (BUILT_IN_FORGE_API_URL).",
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service API key is not configured (BUILT_IN_FORGE_API_KEY).",
    });
  }
  const baseUrl = ENV.forgeApiUrl;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(`${SERVICE}/${rpc}`, normalizedBase).toString();
};

const callForge = async <T>(
  rpc: string,
  body: Record<string, unknown>,
  userSession: string
): Promise<T> => {
  const endpoint = buildEndpoint(rpc);
  const headers: Record<string, string> = {
    accept: "application/json",
    authorization: `Bearer ${ENV.forgeApiKey}`,
    "content-type": "application/json",
    "connect-protocol-version": "1",
  };
  // userSession is the decoded `app_session_id` cookie value (NOT the raw
  // Cookie header). Empty string falls back to the project owner identity.
  if (userSession) {
    headers["x-manus-user-session"] = userSession;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Heartbeat ${rpc} network error: ${String(error)}`,
    });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw mapForgeError(response, detail, rpc);
  }
  return (await response.json()) as T;
};

const mapForgeError = (
  response: Response,
  detail: string,
  rpc: string
): TRPCError => {
  const status = response.status;
  let code: TRPCError["code"] = "INTERNAL_SERVER_ERROR";
  if (status === 401) code = "UNAUTHORIZED";
  else if (status === 403) code = "FORBIDDEN";
  else if (status === 404) code = "NOT_FOUND";
  else if (status === 400 || status === 422) code = "BAD_REQUEST";
  else if (status === 409) code = "CONFLICT";
  else if (status === 429) code = "TOO_MANY_REQUESTS";
  return new TRPCError({
    code,
    message: `Heartbeat ${rpc} failed (${status})${detail ? `: ${detail}` : ""}`,
  });
};

const stringifyPayload = (payload: unknown): string => {
  if (payload === undefined || payload === null) return "{}";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
};

const validateCallbackPath = (path: string): void => {
  if (!path || !path.startsWith("/api/scheduled/")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "callback path must start with /api/scheduled/",
    });
  }
};

/**
 * Create a new HTTP cron job. Returns the assigned `taskUid` to persist on
 * your business row so callbacks can dereference it.
 */
export async function createHeartbeatJob(
  job: HeartbeatJob,
  userSession: string
): Promise<{ taskUid: string; nextExecutionAt?: string | null }> {
  validateCallbackPath(job.path);
  return callForge<{ taskUid: string; nextExecutionAt?: string | null }>(
    "CreateHeartbeatJob",
    {
      name: job.name,
      cronExpression: job.cron,
      callbackPath: job.path,
      callbackMethod: job.method ?? "POST",
      callbackPayload: stringifyPayload(job.payload),
      description: job.description ?? "",
    },
    userSession
  );
}

/**
 * Update an existing cron located by `taskUid`. Only fields you pass in
 * `patch` are mutated. `enable` flips resume/pause; omit to leave alone.
 */
export async function updateHeartbeatJob(
  taskUid: string,
  patch: HeartbeatJobUpdate,
  userSession: string
): Promise<{ nextExecutionAt?: string | null }> {
  if (patch.path !== undefined) validateCallbackPath(patch.path);
  const body: Record<string, unknown> = { taskUid };
  if (patch.cron !== undefined) body.cronExpression = patch.cron;
  if (patch.path !== undefined) body.callbackPath = patch.path;
  if (patch.method !== undefined) body.callbackMethod = patch.method;
  if (patch.payload !== undefined) {
    body.callbackPayload = stringifyPayload(patch.payload);
  }
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.enable !== undefined) body.enable = patch.enable;
  return callForge<{ nextExecutionAt?: string | null }>(
    "UpdateHeartbeatJob",
    body,
    userSession
  );
}

/** Delete a cron located by `taskUid`. Idempotent on caller side. */
export async function deleteHeartbeatJob(
  taskUid: string,
  userSession: string
): Promise<void> {
  await callForge("DeleteHeartbeatJob", { taskUid }, userSession);
}

/**
 * List cron jobs owned by the resolved actor (end-user when `userSession`
 * is set, project owner otherwise) within the current project.
 *
 * `actorUserId` in the response echoes whose cron list you got back. End-users
 * cannot list other users' crons via this SDK; cross-user inspection is
 * owner-only via the sandbox CLI (`manus-heartbeat list --user-id <uid>`).
 */
export async function listHeartbeatJobs(
  userSession: string,
  pagination?: { page?: number; pageSize?: number }
): Promise<{ total: number; actorUserId: string; jobs: HeartbeatJobInfo[] }> {
  const body: Record<string, unknown> = {};
  if (pagination?.page !== undefined) body.page = pagination.page;
  if (pagination?.pageSize !== undefined) body.pageSize = pagination.pageSize;
  return callForge<{
    total: number;
    actorUserId: string;
    jobs: HeartbeatJobInfo[];
  }>("ListHeartbeatJobs", body, userSession);
}

````

### `server/_core/imageGeneration.ts`

````typescript
/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

// Default model for generated sites. "MODEL_GPT_IMAGE_2" is the forge images.v1
// enum for GPT Image 2 (id: gpt-image-2). If omitted, forge falls back to Gemini 2.5 Flash.
const DEFAULT_IMAGE_MODEL = "MODEL_GPT_IMAGE_2";
const DEFAULT_IMAGE_QUALITY = "medium";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  /** Forge image model enum, e.g. "MODEL_GPT_IMAGE_2". Defaults to GPT Image 2. */
  model?: string;
  /** Generation quality, e.g. "medium" | "high". Defaults to "medium" for GPT Image 2. */
  quality?: string;
};

export type GenerateImageResponse = {
  url?: string;
  hasAlpha?: boolean;
  b64Json?: string;
  mimeType?: string;
};

function pngHasAlpha(base64Data: string, mimeType: string) {
  if (mimeType !== "image/png") return false;
  const bytes = Buffer.from(base64Data, "base64");
  if (bytes.length < 26 || bytes.toString("ascii", 1, 4) !== "PNG") return false;
  const colorType = bytes[25];
  return colorType === 4 || colorType === 6;
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  // Build the full URL by appending the service path to the base URL
  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const model = options.model ?? DEFAULT_IMAGE_MODEL;
  const quality =
    options.quality ?? (model === DEFAULT_IMAGE_MODEL ? DEFAULT_IMAGE_QUALITY : undefined);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
      model,
      ...(quality ? { quality } : {}),
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: {
      b64Json: string;
      mimeType: string;
    };
  };
  const base64Data = result.image.b64Json;
  const buffer = Buffer.from(base64Data, "base64");
  const hasAlpha = pngHasAlpha(base64Data, result.image.mimeType);

  // Save to S3
  const extension = result.image.mimeType === "image/jpeg" ? "jpg" : result.image.mimeType === "image/webp" ? "webp" : "png";
  const { url } = await storagePut(
    `generated/${Date.now()}.${extension}`,
    buffer,
    result.image.mimeType
  );
  return {
    url,
    hasAlpha,
    b64Json: base64Data,
    mimeType: result.image.mimeType,
  };
}

export type ImageModelInfo = {
  /** Forge model enum, e.g. "MODEL_GPT_IMAGE_2". Pass into generateImage({ model }). */
  model?: string;
  /** Stable model id, e.g. "gpt-image-2". */
  id?: string;
};

export type ListImageModelsResponse = {
  models: ImageModelInfo[];
};

/**
 * List the image models the internal ImageService currently supports.
 * Feed a returned `model` value into generateImage({ model }).
 */
export async function listImageModels(): Promise<ListImageModelsResponse> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/ListModels",
    baseUrl
  ).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: "{}",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `List image models failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as { models?: ImageModelInfo[] };
  return { models: result.models ?? [] };
}

````

### `server/_core/index.ts`

````typescript
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

````

### `server/_core/llm.ts`

````typescript
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

// Equal-jitter exponential backoff. The cap/2 floor guarantees a minimum
// delay so a misbehaving caller loop slows down instead of hammering the
// upstream while it keeps returning errors.
const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

// Retries non-2xx responses and network errors with exponential backoff, then
// returns the final Response so callers keep their existing error handling.
const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      const nonRetryableStatus = [400, 401, 403, 404, 409, 412, 413, 422];
      if (response.ok || nonRetryableStatus.includes(response.status) || attempt === RETRY_MAX_RETRIES) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens,
  } = params;

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
  };

  if (model) {
    payload.model = model;
  }

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }

  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  assertApiKey();

  const url = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/models`
    : "https://forge.manus.im/v1/models";

  const response = await fetchWithBackoff(url, {
    headers: { authorization: `Bearer ${ENV.forgeApiKey}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as ModelsResponse;
}

````

### `server/_core/map.ts`

````typescript
/**
 * Google Maps API Integration for Manus WebDev Templates
 * 
 * Main function: makeRequest<T>(endpoint, params) - Makes authenticated requests to Google Maps APIs
 * All credentials are automatically injected. Array parameters use | as separator.
 * 
 * See API examples below the type definitions for usage patterns.
 */

import { ENV } from "./env";

// ============================================================================
// Configuration
// ============================================================================

type MapsConfig = {
  baseUrl: string;
  apiKey: string;
};

function getMapsConfig(): MapsConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Google Maps proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
  };
}

// ============================================================================
// Core Request Handler
// ============================================================================

interface RequestOptions {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}

/**
 * Make authenticated requests to Google Maps APIs
 * 
 * @param endpoint - The API endpoint (e.g., "/maps/api/geocode/json")
 * @param params - Query parameters for the request
 * @param options - Additional request options
 * @returns The API response
 */
export async function makeRequest<T = unknown>(
  endpoint: string,
  params: Record<string, unknown> = {},
  options: RequestOptions = {}
): Promise<T> {
  const { baseUrl, apiKey } = getMapsConfig();

  // Construct full URL: baseUrl + /v1/maps/proxy + endpoint
  const url = new URL(`${baseUrl}/v1/maps/proxy${endpoint}`);

  // Add API key as query parameter (standard Google Maps API authentication)
  url.searchParams.append("key", apiKey);

  // Add other query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Maps API request failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  return (await response.json()) as T;
}

// ============================================================================
// Type Definitions
// ============================================================================

export type TravelMode = "driving" | "walking" | "bicycling" | "transit";
export type MapType = "roadmap" | "satellite" | "terrain" | "hybrid";
export type SpeedUnit = "KPH" | "MPH";

export type LatLng = {
  lat: number;
  lng: number;
};

export type DirectionsResult = {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      start_address: string;
      end_address: string;
      start_location: LatLng;
      end_location: LatLng;
      steps: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        html_instructions: string;
        travel_mode: string;
        start_location: LatLng;
        end_location: LatLng;
      }>;
    }>;
    overview_polyline: { points: string };
    summary: string;
    warnings: string[];
    waypoint_order: number[];
  }>;
  status: string;
};

export type DistanceMatrixResult = {
  rows: Array<{
    elements: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      status: string;
    }>;
  }>;
  origin_addresses: string[];
  destination_addresses: string[];
  status: string;
};

export type GeocodingResult = {
  results: Array<{
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address: string;
    geometry: {
      location: LatLng;
      location_type: string;
      viewport: {
        northeast: LatLng;
        southwest: LatLng;
      };
    };
    place_id: string;
    types: string[];
  }>;
  status: string;
};

export type PlacesSearchResult = {
  results: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
      location: LatLng;
    };
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
    types: string[];
  }>;
  status: string;
};

export type PlaceDetailsResult = {
  result: {
    place_id: string;
    name: string;
    formatted_address: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    reviews?: Array<{
      author_name: string;
      rating: number;
      text: string;
      time: number;
    }>;
    opening_hours?: {
      open_now: boolean;
      weekday_text: string[];
    };
    geometry: {
      location: LatLng;
    };
  };
  status: string;
};

export type ElevationResult = {
  results: Array<{
    elevation: number;
    location: LatLng;
    resolution: number;
  }>;
  status: string;
};

export type TimeZoneResult = {
  dstOffset: number;
  rawOffset: number;
  status: string;
  timeZoneId: string;
  timeZoneName: string;
};

export type RoadsResult = {
  snappedPoints: Array<{
    location: LatLng;
    originalIndex?: number;
    placeId: string;
  }>;
};

// ============================================================================
// Google Maps API Reference
// ============================================================================

/**
 * GEOCODING - Convert between addresses and coordinates
 * Endpoint: /maps/api/geocode/json
 * Input: { address: string } OR { latlng: string }  // latlng: "37.42,-122.08"
 * Output: GeocodingResult  // results[0].geometry.location, results[0].formatted_address
 */

/**
 * DIRECTIONS - Get navigation routes between locations
 * Endpoint: /maps/api/directions/json
 * Input: { origin: string, destination: string, mode?: TravelMode, waypoints?: string, alternatives?: boolean }
 * Output: DirectionsResult  // routes[0].legs[0].distance, duration, steps
 */

/**
 * DISTANCE MATRIX - Calculate travel times/distances for multiple origin-destination pairs
 * Endpoint: /maps/api/distancematrix/json
 * Input: { origins: string, destinations: string, mode?: TravelMode, units?: "metric"|"imperial" }  // origins: "NYC|Boston"
 * Output: DistanceMatrixResult  // rows[0].elements[1] = first origin to second destination
 */

/**
 * PLACE SEARCH - Find businesses/POIs by text query
 * Endpoint: /maps/api/place/textsearch/json
 * Input: { query: string, location?: string, radius?: number, type?: string }  // location: "40.7,-74.0"
 * Output: PlacesSearchResult  // results[].name, rating, geometry.location, place_id
 */

/**
 * NEARBY SEARCH - Find places near a specific location
 * Endpoint: /maps/api/place/nearbysearch/json
 * Input: { location: string, radius: number, type?: string, keyword?: string }  // location: "40.7,-74.0"
 * Output: PlacesSearchResult
 */

/**
 * PLACE DETAILS - Get comprehensive information about a specific place
 * Endpoint: /maps/api/place/details/json
 * Input: { place_id: string, fields?: string }  // fields: "name,rating,opening_hours,website"
 * Output: PlaceDetailsResult  // result.name, rating, opening_hours, etc.
 */

/**
 * ELEVATION - Get altitude data for geographic points
 * Endpoint: /maps/api/elevation/json
 * Input: { locations?: string, path?: string, samples?: number }  // locations: "39.73,-104.98|36.45,-116.86"
 * Output: ElevationResult  // results[].elevation (meters)
 */

/**
 * TIME ZONE - Get timezone information for a location
 * Endpoint: /maps/api/timezone/json
 * Input: { location: string, timestamp: number }  // timestamp: Math.floor(Date.now()/1000)
 * Output: TimeZoneResult  // timeZoneId, timeZoneName
 */

/**
 * ROADS - Snap GPS traces to roads, find nearest roads, get speed limits
 * - /v1/snapToRoads: Input: { path: string, interpolate?: boolean }  // path: "lat,lng|lat,lng"
 * - /v1/nearestRoads: Input: { points: string }  // points: "lat,lng|lat,lng"
 * - /v1/speedLimits: Input: { path: string, units?: SpeedUnit }
 * Output: RoadsResult
 */

/**
 * PLACE AUTOCOMPLETE - Real-time place suggestions as user types
 * Endpoint: /maps/api/place/autocomplete/json
 * Input: { input: string, location?: string, radius?: number }
 * Output: { predictions: Array<{ description: string, place_id: string }> }
 */

/**
 * STATIC MAPS - Generate map images as URLs (for emails, reports, <img> tags)
 * Endpoint: /maps/api/staticmap
 * Input: URL params - center: string, zoom: number, size: string, markers?: string, maptype?: MapType
 * Output: Image URL (not JSON) - use directly in <img src={url} />
 * Note: Construct URL manually with getMapsConfig() for auth
 */





````

### `server/_core/notification.ts`

````typescript
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl
    : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Dispatches a project-owner notification through the Manus Notification Service.
 * Returns `true` if the request was accepted, `false` when the upstream service
 * cannot be reached (callers can fall back to email/slack). Validation errors
 * bubble up as TRPC errors so callers can fix the payload.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured.",
    });
  }

  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured.",
    });
  }

  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${
          detail ? `: ${detail}` : ""
        }`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

````

### `server/_core/oauth.ts`

````typescript
import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // CSRF guard: the nonce in `state` must match the one-time cookie that
    // startLogin set in the browser that began this login. An attacker can
    // forge `state`, but cannot plant this cookie in the victim's browser.
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

````

### `server/_core/sdk.ts`

````typescript
import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS, decodeOAuthState } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";
// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }

  private decodeState(state: string): string {
    return decodeOAuthState(state).redirectUri;
  }

  async getTokenByCode(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };

    const { data } = await this.client.post<ExchangeTokenResponse>(
      EXCHANGE_TOKEN_PATH,
      payload
    );

    return data;
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      }
    );

    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      return {
        openId,
        appId,
        name,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async getUserInfoWithJwt(
    jwtToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // 1. Prefer the session cookie (regular OAuth login).
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    // 2. Fallback to the Authorization header (Preview auto-login via
    //    sessionStorage), used when the browser blocks iframe cookies such as
    //    Safari ITP, private browsing, or iOS/Android WebView.
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    // If user not in DB, sync from OAuth server automatically
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

const CRON_OPEN_ID_PREFIX = "cron_";

/** Result of `sdk.authenticateRequest`. Cron callbacks set `isCron=true` and `taskUid`; see `/home/ubuntu/skills/webdev-periodic-updates/SKILL.md`. */
export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

function buildCronUser(
  userInfo: GetUserInfoWithJwtResponse
): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? undefined,
    isCron: true,
  } as AuthenticatedUser;
}

export const sdk = new SDKServer();

````

### `server/_core/storageProxy.ts`

````typescript
import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

````

### `server/_core/systemRouter.ts`

````typescript
import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});

````

### `server/_core/trpc.ts`

````typescript
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

````

### `server/_core/types/cookie.d.ts`

````typescript
declare module "cookie" {
  export function parse(
    str: string,
    options?: Record<string, unknown>
  ): Record<string, string>;
}

````

### `server/_core/types/manusTypes.ts`

````typescript
// WebDev Auth TypeScript types
// Auto-generated from protobuf definitions
// Generated on: 2025-09-24T05:57:57.338Z

export interface AuthorizeRequest {
  redirectUri: string;
  projectId: string;
  state: string;
  responseType: string;
  scope: string;
}

export interface AuthorizeResponse {
  redirectUrl: string;
}

export interface ExchangeTokenRequest {
  grantType: string;
  code: string;
  refreshToken?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

export interface ExchangeTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope: string;
  idToken: string;
}

export interface GetUserInfoRequest {
  accessToken: string;
}

export interface GetUserInfoResponse {
  openId: string;
  projectId: string;
  name: string;
  email?: string | null;
  platform?: string | null;
  loginMethod?: string | null;
}

export interface CanAccessRequest {
  openId: string;
  projectId: string;
}

export interface CanAccessResponse {
  canAccess: boolean;
}

export interface GetUserInfoWithJwtRequest {
  jwtToken: string;
  projectId: string;
}

export interface GetUserInfoWithJwtResponse {
  openId: string;
  projectId: string;
  name: string;
  email?: string | null;
  platform?: string | null;
  loginMethod?: string | null;
  /** Cron-only; references `schedule_task.uid`. */
  taskUid?: string | null;
}

````

### `server/_core/vite.ts`

````typescript
import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

````

### `server/_core/voiceTranscription.ts`

````typescript
/**
 * Voice transcription helper using internal Speech-to-Text service
 *
 * Frontend implementation guide:
 * 1. Capture audio using MediaRecorder API
 * 2. Upload audio to storage (e.g., S3) to get URL
 * 3. Call transcription with the URL
 * 
 * Example usage:
 * ```tsx
 * // Frontend component
 * const transcribeMutation = trpc.voice.transcribe.useMutation({
 *   onSuccess: (data) => {
 *     console.log(data.text); // Full transcription
 *     console.log(data.language); // Detected language
 *     console.log(data.segments); // Timestamped segments
 *   }
 * });
 * 
 * // After uploading audio to storage
 * transcribeMutation.mutate({
 *   audioUrl: uploadedAudioUrl,
 *   language: 'en', // optional
 *   prompt: 'Transcribe the meeting' // optional
 * });
 * ```
 */
import { ENV } from "./env";

export type TranscribeOptions = {
  audioUrl: string; // URL to the audio file (e.g., S3 URL)
  language?: string; // Optional: specify language code (e.g., "en", "es", "zh")
  prompt?: string; // Optional: custom prompt for the transcription
};

// Native Whisper API segment format
export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

// Native Whisper API response format
export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse; // Return native Whisper API response directly

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

/**
 * Transcribe audio to text using the internal Speech-to-Text service
 * 
 * @param options - Audio data and metadata
 * @returns Transcription result or error
 */
export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    // Step 1: Validate environment configuration
    if (!ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL is not set"
      };
    }
    if (!ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_KEY is not set"
      };
    }

    // Step 2: Download audio from URL
    let audioBuffer: Buffer;
    let mimeType: string;
    try {
      const response = await fetch(options.audioUrl);
      if (!response.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get('content-type') || 'audio/mpeg';
      
      // Check file size (16MB limit)
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }

    // Step 3: Create FormData for multipart upload to Whisper API
    const formData = new FormData();
    
    // Create a Blob from the buffer and append to form
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    
    // Add prompt - use custom prompt if provided, otherwise generate based on language
    const prompt = options.prompt || (
      options.language 
        ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}`
        : "Transcribe the user's voice to text"
    );
    formData.append("prompt", prompt);

    // Step 4: Call the transcription service
    const baseUrl = ENV.forgeApiUrl.endsWith("/")
      ? ENV.forgeApiUrl
      : `${ENV.forgeApiUrl}/`;
    
    const fullUrl = new URL(
      "v1/audio/transcriptions",
      baseUrl
    ).toString();

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Accept-Encoding": "identity",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }

    // Step 5: Parse and return the transcription result
    const whisperResponse = await response.json() as WhisperResponse;
    
    // Validate response structure
    if (!whisperResponse.text || typeof whisperResponse.text !== 'string') {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }

    return whisperResponse; // Return native Whisper API response directly

  } catch (error) {
    // Handle unexpected errors
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}

/**
 * Helper function to get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/mp4': 'm4a',
  };
  
  return mimeToExt[mimeType] || 'audio';
}

/**
 * Helper function to get full language name from ISO code
 */
function getLanguageName(langCode: string): string {
  const langMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
  };
  
  return langMap[langCode] || langCode;
}

/**
 * Example tRPC procedure implementation:
 * 
 * ```ts
 * // In server/routers.ts
 * import { transcribeAudio } from "./_core/voiceTranscription";
 * 
 * export const voiceRouter = router({
 *   transcribe: protectedProcedure
 *     .input(z.object({
 *       audioUrl: z.string(),
 *       language: z.string().optional(),
 *       prompt: z.string().optional(),
 *     }))
 *     .mutation(async ({ input, ctx }) => {
 *       const result = await transcribeAudio(input);
 *       
 *       // Check if it's an error
 *       if ('error' in result) {
 *         throw new TRPCError({
 *           code: 'BAD_REQUEST',
 *           message: result.error,
 *           cause: result,
 *         });
 *       }
 *       
 *       // Optionally save transcription to database
 *       await db.insert(transcriptions).values({
 *         userId: ctx.user.id,
 *         text: result.text,
 *         duration: result.duration,
 *         language: result.language,
 *         audioUrl: input.audioUrl,
 *         createdAt: new Date(),
 *       });
 *       
 *       return result;
 *     }),
 * });
 * ```
 */

````

### `server/auth.logout.test.ts`

````typescript
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

````

### `server/creative.test.ts`

````typescript
import { describe, expect, it } from "vitest";
import { buildCutoutPrompt, buildFallbackProjectPlan, buildRefinementPrompt, buildStickerPrompt } from "./routers";

describe("creative prompt builders", () => {
  it("keeps character identity and user direction in the generation prompt", () => {
    const prompt = buildStickerPrompt({ style: "可愛手繪", emotion: "開心", prompt: "讓角色揮手說早安" });
    expect(prompt).toContain("Preserve the exact character identity");
    expect(prompt).toContain("可愛手繪");
    expect(prompt).toContain("讓角色揮手說早安");
  });

  it("asks semantic cutout to preserve pale character details", () => {
    const prompt = buildCutoutPrompt();
    expect(prompt).toContain("semantic subject understanding");
    expect(prompt).toContain("pale or white areas");
    expect(prompt).toContain("transparent background");
  });

  it("turns a chat instruction and visual plan into an edit prompt", () => {
    const prompt = buildRefinementPrompt("文字改成早安", "保留角色姿勢，只替換對話文字");
    expect(prompt).toContain("文字改成早安");
    expect(prompt).toContain("保留角色姿勢");
    expect(prompt).toContain("no watermark");
  });

  it("creates a complete editable fallback plan when AI planning is unavailable", () => {
    const plan = buildFallbackProjectPlan({ brief: "製作日常貼圖", style: "可愛手繪", stickerCount: 4 });
    expect(plan.fallback).toBe(true);
    expect(plan.scripts).toHaveLength(4);
    expect(plan.scripts.map((item) => item.position)).toEqual([1, 2, 3, 4]);
    expect(plan.scripts.every((item) => item.phrase.length > 0 && item.scene.length > 0)).toBe(true);
  });
});

````

### `server/db.ts`

````typescript
import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import {
  InsertStickerProject,
  InsertUser,
  stickerProjects,
  stickerReferences,
  stickerScripts,
  stickerVersions,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  values.lastSignedIn ??= new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createStickerProject(input: InsertStickerProject) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerProjects).values(input);
  const result = await db.select().from(stickerProjects).where(eq(stickerProjects.projectKey, input.projectKey)).limit(1);
  return result[0];
}

export async function getStickerProject(projectKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const project = (await db.select().from(stickerProjects).where(eq(stickerProjects.projectKey, projectKey)).limit(1))[0];
  if (!project) return undefined;
  const references = await db.select().from(stickerReferences).where(eq(stickerReferences.projectId, project.id)).orderBy(asc(stickerReferences.sortOrder));
  const scripts = await db.select().from(stickerScripts).where(eq(stickerScripts.projectId, project.id)).orderBy(asc(stickerScripts.position));
  return { project, references, scripts };
}

export async function addStickerReference(input: { projectId: number; url: string; fileName: string; sortOrder: number }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerReferences).values(input);
  const result = await db.select().from(stickerReferences).where(and(eq(stickerReferences.projectId, input.projectId), eq(stickerReferences.fileName, input.fileName))).orderBy(asc(stickerReferences.sortOrder)).limit(1);
  return result[0];
}

export async function addStickerScript(input: { projectId: number; position: number; emotion: string; phrase: string; scene?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerScripts).values({ ...input, scene: input.scene ?? null });
  const result = await db.select().from(stickerScripts).where(and(eq(stickerScripts.projectId, input.projectId), eq(stickerScripts.position, input.position))).limit(1);
  return result[0];
}

export async function updateStickerScript(input: { id: number; status?: "draft" | "queued" | "generating" | "ready" | "error"; resultUrl?: string | null; errorMessage?: string | null; qualityReport?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;
  const { id, ...updates } = input;
  await db.update(stickerScripts).set(updates).where(eq(stickerScripts.id, id));
  const result = await db.select().from(stickerScripts).where(eq(stickerScripts.id, id)).limit(1);
  return result[0];
}

export async function addStickerVersion(input: { scriptId: number; version: number; url: string; mode: string }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(stickerVersions).values(input);
  const result = await db.select().from(stickerVersions).where(and(eq(stickerVersions.scriptId, input.scriptId), eq(stickerVersions.version, input.version))).limit(1);
  return result[0];
}

````

### `server/index.ts`

````typescript
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

````

### `server/routers.ts`

````typescript
import { COOKIE_NAME } from "@shared/const";
import JSZip from "jszip";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { PNG } from "pngjs";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { addStickerReference, addStickerScript, addStickerVersion, createStickerProject, getStickerProject, getDb, updateStickerScript } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import { publicProcedure, router } from "./_core/trpc";

const imageRefSchema = z.object({ url: z.string().min(1), mimeType: z.string().default("image/png") });
type GenerateInput = { photoDataUrl: string; style: string; emotion: string; prompt?: string; characterProfile?: string; phrase?: string; scene?: string; referenceUrls?: string[] };
type RefineInput = { currentImageUrl: { url: string; mimeType: string }; instruction: string; history: Array<{ role: "user" | "assistant"; content: string }> };

async function resolveImageRef(source: string, mimeType = "image/png") {
  if (/^https?:\/\//.test(source)) return { url: source, mimeType };
  if (source.startsWith("/manus-storage/")) {
    const signedUrl = await storageGetSignedUrl(source.replace(/^\/manus-storage\//, ""));
    return { url: signedUrl, mimeType };
  }
  const match = source.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("圖片格式無法辨識，請重新上傳 JPG、PNG 或 WEBP 圖片");
  return { b64Json: match[2], mimeType: match[1] };
}

async function normalizeReference(base64Data: string, mimeType: string) {
  const buffer = await sharp(Buffer.from(base64Data, "base64")).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer();
  return storagePut(`sticker-references/${Date.now()}-${nanoid(6)}.jpg`, buffer, "image/jpeg");
}

async function createTransparentCutout(base64Data: string) {
  const normalizedPng = await sharp(Buffer.from(base64Data, "base64")).ensureAlpha().png().toBuffer();
  const png = PNG.sync.read(normalizedPng);
  const { width, height, data } = png;
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + width - 1) * 4].map((offset) => [data[offset], data[offset + 1], data[offset + 2]] as const);
  const isBackgroundLike = (offset: number) => corners.some(([r, g, b]) => Math.hypot(data[offset] - r, data[offset + 1] - g, data[offset + 2] - b) < 58);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const enqueue = (x: number, y: number) => { const index = y * width + x; if (visited[index]) return; const offset = index * 4; if (!isBackgroundLike(offset)) return; visited[index] = 1; queue.push(index); };
  for (let x = 0; x < width; x += 1) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y += 1) { enqueue(0, y); enqueue(width - 1, y); }
  while (queue.length) { const index = queue.pop()!; const x = index % width; const y = Math.floor(index / width); data[index * 4 + 3] = 0; if (x > 0) enqueue(x - 1, y); if (x < width - 1) enqueue(x + 1, y); if (y > 0) enqueue(x, y - 1); if (y < height - 1) enqueue(x, y + 1); }
  if (!Array.from({ length: width * height }, (_, index) => data[index * 4 + 3]).some((alpha) => alpha === 0)) throw new Error("無法安全分離背景");
  return PNG.sync.write(png);
}

async function storeGeneratedResult(result: Awaited<ReturnType<typeof generateImage>>) {
  if (!result.url) throw new Error("AI 沒有回傳圖片，請稍後重試");
  if (!result.b64Json) return { url: result.url, hasAlpha: Boolean(result.hasAlpha) };
  try {
    const processed = await createTransparentCutout(result.b64Json);
    const saved = await storagePut(`generated/sticker-${Date.now()}-${nanoid(6)}.png`, processed, "image/png");
    return { url: saved.url, hasAlpha: true };
  } catch {
    return { url: result.url, hasAlpha: Boolean(result.hasAlpha) };
  }
}

async function generateStickerOne(refs: Awaited<ReturnType<typeof resolveImageRef>>[], input: { style: string; characterProfile?: string }, item: z.infer<typeof scriptSchema>) {
  try {
    const result = await generateImage({ prompt: buildStickerPrompt({ style: input.style, emotion: item.emotion, phrase: item.phrase, scene: item.scene, characterProfile: input.characterProfile }), originalImages: refs, quality: "medium" });
    const stored = await storeGeneratedResult(result);
    return { ...item, ...stored, mode: "generate" as const, quality: { transparent: stored.hasAlpha, phrase: item.phrase, dimensions: "檢查完成", textReady: Boolean(item.phrase) }, error: undefined };
  } catch (error) {
    return { ...item, url: "", mode: "generate" as const, hasAlpha: false, quality: undefined, error: error instanceof Error ? error.message : "這張貼圖生成失敗" };
  }
}

export function buildStickerPrompt(input: { prompt?: string; style: string; emotion: string; characterProfile?: string; phrase?: string; scene?: string }) {
  return [
    "Create one polished messaging sticker from the supplied character reference images.",
    "Preserve the exact character identity, species, colors, markings, face and recognizable features across all references. Do not invent another character.",
    `Visual style: ${input.style}. Emotion or action: ${input.emotion}.`,
    input.characterProfile ? `Character bible: ${input.characterProfile}.` : "Keep the character consistent with the reference photos.",
    input.phrase ? `Sticker phrase in Traditional Chinese: ${input.phrase}.` : "Use no text unless requested.",
    input.scene ? `Scene and pose: ${input.scene}.` : "Use a clear expressive pose.",
    input.prompt ? `Additional user direction: ${input.prompt}.` : "",
    "One subject, clean messaging-sticker composition, transparent background, no watermark, no extra characters.",
  ].filter(Boolean).join(" ");
}

export function buildCutoutPrompt() { return "Remove the background from the supplied character photo using semantic subject understanding. Preserve every part of the character, including pale or white areas, fur, whiskers, ears, hands and accessories. Return the same character isolated on a transparent background, with clean edges and no new objects."; }
export function buildRefinementPrompt(instruction: string, plan: string) { return ["Edit the supplied sticker image while preserving the original character identity and overall composition.", `Apply this requested change: ${instruction}.`, `Use this concise visual plan: ${plan}.`, "Keep the result as a polished messaging sticker with clean edges, readable Traditional Chinese text when relevant, no watermark and no unrelated changes."].join(" "); }

const scriptSchema = z.object({ position: z.number().int().min(1).max(40), emotion: z.string().min(1).max(80), phrase: z.string().min(1).max(160), scene: z.string().max(300) });

const fallbackPhraseSeeds = [
  ["早安", "揮手打招呼，精神飽滿"], ["謝謝", "雙手合十，溫暖微笑"], ["收到", "敬禮或點頭，表情俐落"], ["加油", "握拳鼓勵，充滿活力"], ["等等我", "小跑步揮手，帶一點急迫感"], ["好累喔", "慵懶趴下，表情可愛"], ["太好了", "開心跳起來，周圍有小星星"], ["不要啦", "搖手拒絕，表情撒嬌"], ["晚安", "抱著枕頭打呵欠"], ["掰掰", "揮手道別，笑容可愛"],
] as const;

export function buildFallbackProjectPlan(input: { brief: string; style: string; stickerCount: number; characterProfile?: string }) {
  return {
    title: "我的專屬貼圖組",
    characterProfile: input.characterProfile || "請依據上傳照片保留角色的臉型、配色、毛色或服裝等可辨識特徵，所有貼圖維持一致角色設定。",
    scripts: Array.from({ length: input.stickerCount }, (_, index) => {
      const [phrase, scene] = fallbackPhraseSeeds[index % fallbackPhraseSeeds.length];
      return { position: index + 1, emotion: phrase, phrase, scene };
    }),
    fallback: true,
    fallbackMessage: "AI 規劃服務暫時沒有可用額度，已先建立可編輯的基礎貼圖腳本。",
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  project: router({
    plan: publicProcedure.input(z.object({ brief: z.string().min(3).max(1000), style: z.string().min(1), stickerCount: z.number().int().min(4).max(40), characterProfile: z.string().max(1200).optional() })).mutation(async ({ input }) => {
      try {
        const planResult = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "You are a professional messaging sticker art director. Create a practical sticker project plan in Traditional Chinese. Output JSON only." }, { role: "user", content: `需求：${input.brief}\n風格：${input.style}\n張數：${input.stickerCount}\n角色補充：${input.characterProfile ?? "請從照片分析"}` }], response_format: { type: "json_schema", json_schema: { name: "sticker_project_plan", strict: true, schema: { type: "object", properties: { title: { type: "string" }, characterProfile: { type: "string" }, scripts: { type: "array", items: { type: "object", properties: { position: { type: "integer" }, emotion: { type: "string" }, phrase: { type: "string" }, scene: { type: "string" } }, required: ["position", "emotion", "phrase", "scene"], additionalProperties: false } } }, required: ["title", "characterProfile", "scripts"], additionalProperties: false } } } });
        const raw = planResult.choices[0]?.message?.content;
        if (typeof raw !== "string") throw new Error("AI 方案規劃沒有回傳內容");
        return { ...(JSON.parse(raw) as { title: string; characterProfile: string; scripts: Array<z.infer<typeof scriptSchema>> }), fallback: false, fallbackMessage: undefined };
      } catch (error) {
        console.warn("[Sticker plan] Falling back to editable local plan:", error);
        return buildFallbackProjectPlan(input);
      }
    }),
    create: publicProcedure.input(z.object({ title: z.string().min(1).max(160), brief: z.string().max(1000), style: z.string().min(1).max(80), stickerCount: z.number().int().min(4).max(40), characterProfile: z.string().max(2000), references: z.array(z.object({ url: z.string(), fileName: z.string(), sortOrder: z.number().int() })).max(10), scripts: z.array(scriptSchema).max(40) })).mutation(async ({ input }) => {
      const project = await createStickerProject({ projectKey: nanoid(12), title: input.title, brief: input.brief, style: input.style, stickerCount: input.stickerCount, characterProfile: input.characterProfile, status: "draft" });
      if (!project) throw new Error("貼圖專案資料庫暫時無法使用，請稍後再試");
      for (const ref of input.references) await addStickerReference({ projectId: project.id, ...ref });
      for (const script of input.scripts) await addStickerScript({ projectId: project.id, ...script });
      return { projectKey: project.projectKey, scripts: input.scripts };
    }),
    get: publicProcedure.input(z.object({ projectKey: z.string().min(1) })).query(async ({ input }) => (await getStickerProject(input.projectKey)) ?? null),
    prepareReference: publicProcedure.input(z.object({ photoDataUrl: z.string().min(32), fileName: z.string().min(1) })).mutation(async ({ input }) => { const parsed = await resolveImageRef(input.photoDataUrl); if (!parsed.b64Json) throw new Error("參考照片格式無法讀取"); const saved = await normalizeReference(parsed.b64Json, parsed.mimeType); return { url: saved.url, fileName: input.fileName, mimeType: "image/jpeg" }; }),
  }),
  creative: router({
    generate: publicProcedure.input(z.object({ photoDataUrl: z.string().min(32), style: z.string().min(1).max(80), emotion: z.string().min(1).max(80), prompt: z.string().max(500).optional(), characterProfile: z.string().max(2000).optional(), phrase: z.string().max(160).optional(), scene: z.string().max(300).optional(), referenceUrls: z.array(z.string()).max(10).optional() })).mutation(async ({ input }: { input: GenerateInput }) => { const refs = input.referenceUrls?.length ? await Promise.all(input.referenceUrls.map((url) => resolveImageRef(url))) : [await resolveImageRef(input.photoDataUrl)]; const result = await generateImage({ prompt: buildStickerPrompt(input), originalImages: refs, quality: "medium" }); const stored = await storeGeneratedResult(result); return { ...stored, mode: "generate" as const }; }),
    generateBatch: publicProcedure.input(z.object({ projectKey: z.string().optional(), photoDataUrl: z.string().min(32), referenceUrls: z.array(z.string()).max(10).optional(), style: z.string().min(1), characterProfile: z.string().max(2000).optional(), items: z.array(scriptSchema).min(1).max(40) })).mutation(async ({ input }) => { const refs = input.referenceUrls?.length ? await Promise.all(input.referenceUrls.map((url) => resolveImageRef(url))) : [await resolveImageRef(input.photoDataUrl)]; const project = input.projectKey ? await getStickerProject(input.projectKey) : undefined; const scriptRows = new Map((project?.scripts ?? []).map((script) => [script.position, script])); const results = []; for (let index = 0; index < input.items.length; index += 2) { const chunk = input.items.slice(index, index + 2); const generated = await Promise.all(chunk.map((item) => generateStickerOne(refs, input, item))); results.push(...generated); await Promise.all(generated.map((item) => { const row = scriptRows.get(item.position); if (!row) return undefined; return updateStickerScript({ id: row.id, status: item.error ? "error" : "ready", resultUrl: item.url || null, errorMessage: item.error || null, qualityReport: item.quality ? JSON.stringify(item.quality) : null }); })); } return results; }),
    removeBackground: publicProcedure.input(z.object({ photoDataUrl: z.string().min(32) })).mutation(async ({ input }) => { const original = await resolveImageRef(input.photoDataUrl); const result = await generateImage({ prompt: buildCutoutPrompt(), originalImages: [original], quality: "high" }); if (!result.url) throw new Error("AI 沒有回傳去背圖片，請稍後重試"); const stored = await storeGeneratedResult(result); return { url: stored.url, mode: "cutout" as const, hasAlpha: stored.hasAlpha }; }),
    refine: publicProcedure.input(z.object({ currentImageUrl: imageRefSchema, instruction: z.string().min(2).max(500), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(700) })).max(12).default([]) })).mutation(async ({ input }: { input: RefineInput }) => { try { const planResult = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "You are a sticker art director. Convert the user's requested edit into one concise visual plan. Return JSON only." }, ...input.history.map((item) => ({ role: item.role, content: item.content })), { role: "user", content: input.instruction }], response_format: { type: "json_schema", json_schema: { name: "sticker_refinement", strict: true, schema: { type: "object", properties: { plan: { type: "string" }, reply: { type: "string" } }, required: ["plan", "reply"], additionalProperties: false } } } }); const raw = planResult.choices[0]?.message?.content; const parsed = typeof raw === "string" ? JSON.parse(raw) as { plan: string; reply: string } : { plan: input.instruction, reply: "我會依照你的要求重新調整貼圖。" }; const result = await generateImage({ prompt: buildRefinementPrompt(input.instruction, parsed.plan), originalImages: [await resolveImageRef(input.currentImageUrl.url, input.currentImageUrl.mimeType)], quality: "medium" }); const stored = await storeGeneratedResult(result); return { ...stored, reply: parsed.reply, plan: parsed.plan, mode: "refine" as const, unchanged: false }; } catch (error) { const message = error instanceof Error ? error.message : "AI 修改服務暫時無法使用"; if (/usage exhausted|failed_precondition/i.test(message)) return { url: input.currentImageUrl.url, mode: "refine" as const, hasAlpha: false, plan: input.instruction, reply: "AI 修改服務目前使用量已暫時耗盡，原本版本已保留；請稍後再試。", unchanged: true }; throw error; } }),
    qualityCheck: publicProcedure.input(z.object({ url: z.string(), phrase: z.string().max(160) })).mutation(async ({ input }) => { const signed = await resolveImageRef(input.url); if (!signed.url) throw new Error("無法取得圖片網址"); const response = await fetch(signed.url); const buffer = Buffer.from(await response.arrayBuffer()); const metadata = await sharp(buffer).metadata(); const transparent = metadata.hasAlpha === true; const dimensions = Boolean(metadata.width && metadata.height && metadata.width >= 240 && metadata.height >= 240); const textReady = input.phrase.trim().length > 0 && input.phrase.length <= 40; return { transparent, dimensions, textReady, report: { transparent: transparent ? "透明背景已檢查" : "需要重新去背", dimensions: dimensions ? `${metadata.width}×${metadata.height}` : "尺寸需要調整", text: textReady ? "文字腳本已建立，請人工確認字形" : "尚未設定文字" } }; }),
    exportZip: publicProcedure.input(z.object({ files: z.array(z.object({ url: z.string(), fileName: z.string() })).min(1).max(40) })).mutation(async ({ input }) => { const zip = new JSZip(); for (const file of input.files) { const signed = await resolveImageRef(file.url); if (!signed.url) throw new Error(`無法取得 ${file.fileName} 的圖片網址`); const response = await fetch(signed.url); if (!response.ok) throw new Error(`無法讀取 ${file.fileName}`); zip.file(file.fileName, Buffer.from(await response.arrayBuffer())); } return { fileName: "sticker-tycoon-pack.zip", base64: await zip.generateAsync({ type: "base64", compression: "DEFLATE" }) }; }),
  }),
});

export type AppRouter = typeof appRouter;

````

### `server/storage.ts`

````typescript
// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.

import { ENV } from "./_core/env";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}

````

### `shared/_core/errors.ts`

````typescript
/**
 * Base HTTP error class with status code.
 * Throw this from route handlers to send specific HTTP errors.
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// Convenience constructors
export const BadRequestError = (msg: string) => new HttpError(400, msg);
export const UnauthorizedError = (msg: string) => new HttpError(401, msg);
export const ForbiddenError = (msg: string) => new HttpError(403, msg);
export const NotFoundError = (msg: string) => new HttpError(404, msg);

````

### `shared/const.ts`

````typescript
export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// One-time nonce cookie that binds an OAuth login to the browser that started
// it. The `__Host-` prefix forces the cookie host-only (Secure, Path=/, no
// Domain), so a sibling *.manus.space site cannot plant a matching value in a
// victim's browser.
export const OAUTH_STATE_COOKIE = "__Host-oauth_state";

// `state` carries the callback redirect URI (used at token exchange) plus the
// CSRF nonce. Defined here so the client encoder and server decoder never drift.
export type OAuthState = { redirectUri: string; nonce?: string };

export const encodeOAuthState = (state: OAuthState): string =>
  btoa(JSON.stringify(state));

export const decodeOAuthState = (state: string): OAuthState => {
  let decoded: string;
  try {
    decoded = atob(state);
  } catch {
    // Malformed base64 (e.g. attacker-supplied garbage). Return no nonce so the
    // callback's CSRF guard rejects it with 403 — never throw, since the caller
    // runs outside the request handler's try/catch.
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
    // Legacy links: `state` was a bare base64(redirectUri) with no nonce.
  }
  return { redirectUri: decoded };
};

````

### `shared/types.ts`

````typescript
/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

````

### `template.json`

````json
{
  "id": "web-static",
  "name": "Web App (static only)",
  "description": "A pure frontend static website with React and Vite, no backend server.",
  "capabilities": [
    "static"
  ],
  "files": {
    "package.json": "{\n  \"name\": \"sticker-tycoon-replica\",\n  \"version\": \"1.0.0\",\n  \"type\": \"module\",\n  \"license\": \"MIT\",\n  \"scripts\": {\n    \"dev\": \"vite --host\",\n    \"build\": \"vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist\",\n    \"start\": \"NODE_ENV=production node dist/index.js\",\n    \"preview\": \"vite preview --host\",\n    \"check\": \"tsc --noEmit\",\n    \"format\": \"prettier --write .\"\n  },\n  \"dependencies\": {\n    \"@hookform/resolvers\": \"^5.2.2\",\n    \"@radix-ui/react-accordion\": \"^1.2.12\",\n    \"@radix-ui/react-alert-dialog\": \"^1.1.15\",\n    \"@radix-ui/react-aspect-ratio\": \"^1.1.7\",\n    \"@radix-ui/react-avatar\": \"^1.1.10\",\n    \"@radix-ui/react-checkbox\": \"^1.3.3\",\n    \"@radix-ui/react-collapsible\": \"^1.1.12\",\n    \"@radix-ui/react-context-menu\": \"^2.2.16\",\n    \"@radix-ui/react-dialog\": \"^1.1.15\",\n    \"@radix-ui/react-dropdown-menu\": \"^2.1.16\",\n    \"@radix-ui/react-hover-card\": \"^1.1.15\",\n    \"@radix-ui/react-label\": \"^2.1.7\",\n    \"@radix-ui/react-menubar\": \"^1.1.16\",\n    \"@radix-ui/react-navigation-menu\": \"^1.2.14\",\n    \"@radix-ui/react-popover\": \"^1.1.15\",\n    \"@radix-ui/react-progress\": \"^1.1.7\",\n    \"@radix-ui/react-radio-group\": \"^1.3.8\",\n    \"@radix-ui/react-scroll-area\": \"^1.2.10\",\n    \"@radix-ui/react-select\": \"^2.2.6\",\n    \"@radix-ui/react-separator\": \"^1.1.7\",\n    \"@radix-ui/react-slider\": \"^1.3.6\",\n    \"@radix-ui/react-slot\": \"^1.2.3\",\n    \"@radix-ui/react-switch\": \"^1.2.6\",\n    \"@radix-ui/react-tabs\": \"^1.1.13\",\n    \"@radix-ui/react-toggle\": \"^1.1.10\",\n    \"@radix-ui/react-toggle-group\": \"^1.1.11\",\n    \"@radix-ui/react-tooltip\": \"^1.2.8\",\n    \"axios\": \"^1.12.0\",\n    \"class-variance-authority\": \"^0.7.1\",\n    \"clsx\": \"^2.1.1\",\n    \"cmdk\": \"^1.1.1\",\n    \"embla-carousel-react\": \"^8.6.0\",\n    \"express\": \"^4.21.2\",\n    \"framer-motion\": \"^12.23.22\",\n    \"input-otp\": \"^1.4.2\",\n    \"lucide-react\": \"^0.453.0\",\n    \"nanoid\": \"^5.1.5\",\n    \"next-themes\": \"^0.4.6\",\n    \"react\": \"^19.2.1\",\n    \"react-day-picker\": \"^9.11.1\",\n    \"react-dom\": \"^19.2.1\",\n    \"react-hook-form\": \"^7.64.0\",\n    \"react-resizable-panels\": \"^3.0.6\",\n    \"recharts\": \"^2.15.2\",\n    \"sonner\": \"^2.0.7\",\n    \"streamdown\": \"^1.4.0\",\n    \"tailwind-merge\": \"^3.3.1\",\n    \"tailwindcss-animate\": \"^1.0.7\",\n    \"vaul\": \"^1.1.2\",\n    \"wouter\": \"^3.3.5\",\n    \"zod\": \"^4.1.12\"\n  },\n  \"devDependencies\": {\n    \"@builder.io/vite-plugin-jsx-loc\": \"^0.1.1\",\n    \"@tailwindcss/typography\": \"^0.5.15\",\n    \"@tailwindcss/vite\": \"^4.1.3\",\n    \"@types/express\": \"4.17.21\",\n    \"@types/google.maps\": \"^3.58.1\",\n    \"@types/node\": \"^24.7.0\",\n    \"@types/react\": \"^19.2.1\",\n    \"@types/react-dom\": \"^19.2.1\",\n    \"@vitejs/plugin-react\": \"^5.0.4\",\n    \"add\": \"^2.0.6\",\n    \"autoprefixer\": \"^10.4.20\",\n    \"esbuild\": \"^0.25.0\",\n    \"pnpm\": \"^10.15.1\",\n    \"postcss\": \"^8.4.47\",\n    \"prettier\": \"^3.6.2\",\n    \"tailwindcss\": \"^4.1.14\",\n    \"tsx\": \"^4.19.1\",\n    \"tw-animate-css\": \"^1.4.0\",\n    \"typescript\": \"5.6.3\",\n    \"vite\": \"^7.1.7\",\n    \"vite-plugin-manus-runtime\": \"^0.0.58\",\n    \"vitest\": \"^2.1.4\"\n  },\n  \"packageManager\": \"pnpm@10.4.1+sha512.c753b6c3ad7afa13af388fa6d808035a008e30ea9993f58c6663e2bc5ff21679aa834db094987129aa4d488b86df57f7b634981b2f827cdcacc698cc0cfb88af\",\n  \"pnpm\": {\n    \"patchedDependencies\": {\n      \"wouter@3.7.1\": \"patches/wouter@3.7.1.patch\"\n    },\n    \"overrides\": {\n      \"tailwindcss>nanoid\": \"3.3.7\"\n    }\n  }\n}",
    "client/src/App.tsx": "import { Toaster } from \"@/components/ui/sonner\";\nimport { TooltipProvider } from \"@/components/ui/tooltip\";\nimport NotFound from \"@/pages/NotFound\";\nimport { Route, Switch } from \"wouter\";\nimport ErrorBoundary from \"./components/ErrorBoundary\";\nimport { ThemeProvider } from \"./contexts/ThemeContext\";\nimport Home from \"./pages/Home\";\n\n\nfunction Router() {\n  return (\n    <Switch>\n      <Route path={\"/\"} component={Home} />\n      <Route path={\"/404\"} component={NotFound} />\n      {/* Final fallback route */}\n      <Route component={NotFound} />\n    </Switch>\n  );\n}\n\n// NOTE: About Theme\n// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css\n//   to keep consistent foreground/background color across components\n// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook\n\nfunction App() {\n  return (\n    <ErrorBoundary>\n      <ThemeProvider\n        defaultTheme=\"light\"\n        // switchable\n      >\n        <TooltipProvider>\n          <Toaster />\n          <Router />\n        </TooltipProvider>\n      </ThemeProvider>\n    </ErrorBoundary>\n  );\n}\n\nexport default App;",
    "client/src/pages/Home.tsx": "import { Button } from \"@/components/ui/button\";\nimport { Loader2 } from \"lucide-react\";\nimport { Streamdown } from 'streamdown';\n\n/**\n * All content in this page are only for example, replace with your own feature implementation\n * When building pages, remember your instructions in Frontend Best Practices, Design Guide and Common Pitfalls\n */\nexport default function Home() {\n  // If theme is switchable in App.tsx, we can implement theme toggling like this:\n  // const { theme, toggleTheme } = useTheme();\n\n  return (\n    <div className=\"min-h-screen flex flex-col\">\n      <main>\n        {/* Example: lucide-react for icons */}\n        <Loader2 className=\"animate-spin\" />\n        Example Page\n        {/* Example: Streamdown for markdown rendering */}\n        <Streamdown>Any **markdown** content</Streamdown>\n        <Button variant=\"default\">Example Button</Button>\n      </main>\n    </div>\n  );\n}",
    "client/src/index.css": "@import \"tailwindcss\";\n@import \"tw-animate-css\";\n\n@custom-variant dark (&:is(.dark *));\n\n@theme inline {\n  --radius-sm: calc(var(--radius) - 4px);\n  --radius-md: calc(var(--radius) - 2px);\n  --radius-lg: var(--radius);\n  --radius-xl: calc(var(--radius) + 4px);\n  --color-background: var(--background);\n  --color-foreground: var(--foreground);\n  --color-card: var(--card);\n  --color-card-foreground: var(--card-foreground);\n  --color-popover: var(--popover);\n  --color-popover-foreground: var(--popover-foreground);\n  --color-primary: var(--primary);\n  --color-primary-foreground: var(--primary-foreground);\n  --color-secondary: var(--secondary);\n  --color-secondary-foreground: var(--secondary-foreground);\n  --color-muted: var(--muted);\n  --color-muted-foreground: var(--muted-foreground);\n  --color-accent: var(--accent);\n  --color-accent-foreground: var(--accent-foreground);\n  --color-destructive: var(--destructive);\n  --color-destructive-foreground: var(--destructive-foreground);\n  --color-border: var(--border);\n  --color-input: var(--input);\n  --color-ring: var(--ring);\n  --color-chart-1: var(--chart-1);\n  --color-chart-2: var(--chart-2);\n  --color-chart-3: var(--chart-3);\n  --color-chart-4: var(--chart-4);\n  --color-chart-5: var(--chart-5);\n  --color-sidebar: var(--sidebar);\n  --color-sidebar-foreground: var(--sidebar-foreground);\n  --color-sidebar-primary: var(--sidebar-primary);\n  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);\n  --color-sidebar-accent: var(--sidebar-accent);\n  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);\n  --color-sidebar-border: var(--sidebar-border);\n  --color-sidebar-ring: var(--sidebar-ring);\n}\n\n:root {\n  --primary: var(--color-blue-700);\n  --primary-foreground: var(--color-blue-50);\n  --sidebar-primary: var(--color-blue-600);\n  --sidebar-primary-foreground: var(--color-blue-50);\n  --chart-1: var(--color-blue-300);\n  --chart-2: var(--color-blue-500);\n  --chart-3: var(--color-blue-600);\n  --chart-4: var(--color-blue-700);\n  --chart-5: var(--color-blue-800);\n  --radius: 0.65rem;\n  --background: oklch(1 0 0);\n  --foreground: oklch(0.235 0.015 65);\n  --card: oklch(1 0 0);\n  --card-foreground: oklch(0.235 0.015 65);\n  --popover: oklch(1 0 0);\n  --popover-foreground: oklch(0.235 0.015 65);\n  --secondary: oklch(0.98 0.001 286.375);\n  --secondary-foreground: oklch(0.4 0.015 65);\n  --muted: oklch(0.967 0.001 286.375);\n  --muted-foreground: oklch(0.552 0.016 285.938);\n  --accent: oklch(0.967 0.001 286.375);\n  --accent-foreground: oklch(0.141 0.005 285.823);\n  --destructive: oklch(0.577 0.245 27.325);\n  --destructive-foreground: oklch(0.985 0 0);\n  --border: oklch(0.92 0.004 286.32);\n  --input: oklch(0.92 0.004 286.32);\n  --ring: oklch(0.623 0.214 259.815);\n  --sidebar: oklch(0.985 0 0);\n  --sidebar-foreground: oklch(0.235 0.015 65);\n  --sidebar-accent: oklch(0.967 0.001 286.375);\n  --sidebar-accent-foreground: oklch(0.141 0.005 285.823);\n  --sidebar-border: oklch(0.92 0.004 286.32);\n  --sidebar-ring: oklch(0.623 0.214 259.815);\n}\n\n.dark {\n  --primary: var(--color-blue-700);\n  --primary-foreground: var(--color-blue-50);\n  --sidebar-primary: var(--color-blue-500);\n  --sidebar-primary-foreground: var(--color-blue-50);\n  --background: oklch(0.141 0.005 285.823);\n  --foreground: oklch(0.85 0.005 65);\n  --card: oklch(0.21 0.006 285.885);\n  --card-foreground: oklch(0.85 0.005 65);\n  --popover: oklch(0.21 0.006 285.885);\n  --popover-foreground: oklch(0.85 0.005 65);\n  --secondary: oklch(0.24 0.006 286.033);\n  --secondary-foreground: oklch(0.7 0.005 65);\n  --muted: oklch(0.274 0.006 286.033);\n  --muted-foreground: oklch(0.705 0.015 286.067);\n  --accent: oklch(0.274 0.006 286.033);\n  --accent-foreground:  oklch(0.92 0.005 65);\n  --destructive: oklch(0.704 0.191 22.216);\n  --destructive-foreground: oklch(0.985 0 0);\n  --border: oklch(1 0 0 / 10%);\n  --input: oklch(1 0 0 / 15%);\n  --ring: oklch(0.488 0.243 264.376);\n  --chart-1: var(--color-blue-300);\n  --chart-2: var(--color-blue-500);\n  --chart-3: var(--color-blue-600);\n  --chart-4: var(--color-blue-700);\n  --chart-5: var(--color-blue-800);\n  --sidebar: oklch(0.21 0.006 285.885);\n  --sidebar-foreground: oklch(0.85 0.005 65);\n  --sidebar-accent: oklch(0.274 0.006 286.033);\n  --sidebar-accent-foreground:  oklch(0.985 0 0);\n  --sidebar-border: oklch(1 0 0 / 10%);\n  --sidebar-ring: oklch(0.488 0.243 264.376);\n}\n\n@layer base {\n  * {\n    @apply border-border outline-ring/50;\n  }\n  body {\n    @apply bg-background text-foreground;\n  }\n  button:not(:disabled),\n  [role=\"button\"]:not([aria-disabled=\"true\"]),\n  [type=\"button\"]:not(:disabled),\n  [type=\"submit\"]:not(:disabled),\n  [type=\"reset\"]:not(:disabled),\n  a[href],\n  select:not(:disabled),\n  input[type=\"checkbox\"]:not(:disabled),\n  input[type=\"radio\"]:not(:disabled) {\n    @apply cursor-pointer;\n  }\n}\n\n@layer components {\n  /**\n   * Custom container utility that centers content and adds responsive padding.\n   *\n   * This overrides Tailwind's default container behavior to:\n   * - Auto-center content (mx-auto)\n   * - Add responsive horizontal padding\n   * - Set max-width for large screens\n   *\n   * Usage: <div className=\"container\">...</div>\n   *\n   * For custom widths, use max-w-* utilities directly:\n   * <div className=\"max-w-6xl mx-auto px-4\">...</div>\n   */\n  .container {\n    width: 100%;\n    margin-left: auto;\n    margin-right: auto;\n    padding-left: 1rem; /* 16px - mobile padding */\n    padding-right: 1rem;\n  }\n\n  .flex {\n    min-height: 0;\n    min-width: 0;\n  }\n\n  @media (min-width: 640px) {\n    .container {\n      padding-left: 1.5rem; /* 24px - tablet padding */\n      padding-right: 1.5rem;\n    }\n  }\n\n  @media (min-width: 1024px) {\n    .container {\n      padding-left: 2rem; /* 32px - desktop padding */\n      padding-right: 2rem;\n      max-width: 1280px; /* Standard content width */\n    }\n  }\n}",
    "client/index.html": "<!doctype html>\n<html lang=\"en\">\n\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta\n      name=\"viewport\"\n      content=\"width=device-width, initial-scale=1.0, maximum-scale=1\" />\n    <title>貼圖大亨 Sticker Tycoon</title>    \n    <!-- THIS IS THE START OF A COMMENT BLOCK, BLOCK TO BE DELETED: Google Fonts here, example:\n    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />\n    <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap\" rel=\"stylesheet\" />\n    THIS IS THE END OF A COMMENT BLOCK, BLOCK TO BE DELETED -->\n  </head>\n\n  <body>\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/src/main.tsx\"></script>\n    <script\n      defer\n      src=\"%VITE_ANALYTICS_ENDPOINT%/umami\"\n      data-website-id=\"%VITE_ANALYTICS_WEBSITE_ID%\"></script>\n  </body>\n\n</html>",
    "server/index.ts": "import express from \"express\";\nimport { createServer } from \"http\";\nimport path from \"path\";\nimport { fileURLToPath } from \"url\";\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\n\nasync function startServer() {\n  const app = express();\n  const server = createServer(app);\n\n  // Serve static files from dist/public in production\n  const staticPath =\n    process.env.NODE_ENV === \"production\"\n      ? path.resolve(__dirname, \"public\")\n      : path.resolve(__dirname, \"..\", \"dist\", \"public\");\n\n  app.use(express.static(staticPath));\n\n  // Handle client-side routing - serve index.html for all routes\n  app.get(\"*\", (_req, res) => {\n    res.sendFile(path.join(staticPath, \"index.html\"));\n  });\n\n  const port = process.env.PORT || 3000;\n\n  server.listen(port, () => {\n    console.log(`Server running on http://localhost:${port}/`);\n  });\n}\n\nstartServer().catch(console.error);"
  }
}

````

### `todo.md`

````markdown
# 完整 AI 貼圖工作流整合

- [x] 讀取現有 AI 路由、前端工作室、圖片儲存與測試，確認可沿用架構。
- [x] 檢查並處理 10 張 HEIC 參考照片，建立可供 AI 使用的安全圖片輸入。
- [x] 建立專案精靈：需求對話、方案規劃、角色設定、多張照片、張數選擇。
- [x] 建立角色一致性資料與文字／情境腳本編輯。
- [x] 建立獨立貼圖批次生成、逐張進度、續作與重試狀態。
- [x] 建立透明背景與品質檢查，包括尺寸、alpha、文字與結果狀態。
- [x] 整合單張對話式修改與修改歷史。
- [x] 建立檔名、編號、排序與 ZIP 匯出。
- [x] 更新首頁與工作室介面，呈現完整專案流程。
- [x] 用 10 張使用者照片實測批次生成並保存結果（5/10 成功；5 張因 AI 使用量限制待重試）。
- [x] 若實測失敗，記錄原因、修正程式並重新驗證。
- [x] 執行 TypeScript、測試、production build 與桌面／手機視覺驗證。
- [x] 建立最終 checkpoint 並交付更新預覽與生成結果。

- [x] 在批次結果中清楚顯示部分成功與失敗張數。
- [x] 將 usage exhausted 顯示為可理解的 AI 服務使用量限制，而不是空白圖片。
- [x] 加入只重試失敗貼圖的按鈕與流程。
- [x] 修正批次測試腳本的成功判定，避免部分失敗仍輸出 GENERATED_10_OK。

- [x] 前端保存並載入 projectKey，恢復既有專案腳本與生成結果。
- [x] 提供恢復未完成貼圖與只重試失敗項目的續作入口。
- [x] 為貼圖腳本與結果加入上移、下移排序操作。
- [x] 確保排序後編號、下載檔名與 ZIP 順序同步更新。
- [x] 將實測結果明確記錄為 5/10 成功，5 張受 AI 使用量限制待重試，不宣稱十張全部完成。

# HEIC 上傳與全流程診斷

- [x] 重現使用者提供 HEIC 多照片上傳時的前端錯誤。
- [x] 修正 HEIC 轉換、檔案大小與多檔上傳的相容性問題。
- [x] 改善上傳失敗訊息，逐張顯示可操作的失敗原因。
- [x] 測試專案建立、AI 規劃、批次生成、品質檢查、修改、排序、續作與 ZIP 匯出。
- [x] 修正檢查發現的流程錯誤並完成手機／桌面驗證。
- [x] 保存診斷修正 checkpoint 並交付更新預覽。

- [x] 在真實瀏覽器中上傳使用者提供的 5 張 HEIC，驗證裝置端轉檔與多檔加入。
- [x] 加入過大照片的檔案大小限制與清楚提示。
- [x] 驗證聊天修改、排序、載入既有專案與 ZIP 匯出操作。
- [x] 在最新 HEIC 修正後完成桌面與手機視覺驗證。

- [x] 用既有成功貼圖在瀏覽器驗證 ZIP 按鈕、下載與排序後檔名順序。
- [x] 驗證聊天修改在外部 AI 額度耗盡時保留原圖並提供清楚訊息。

# GPT 交接文件

- [ ] 將可見開發對話、功能狀態、驗證結果與可分享原始碼彙整為單一 GPT 交接檔案。

````

### `tsconfig.json`

````json
{
  "include": ["client/src/**/*", "shared/**/*", "server/**/*"],
  "exclude": ["node_modules", "build", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/typescript/tsbuildinfo",
    "noEmit": true,
    "module": "ESNext",
    "strict": true,
    "lib": ["esnext", "dom", "dom.iterable"],
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}

````

### `tsconfig.node.json`

````json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}

````

### `vite.config.ts`

````typescript
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

````


## 8. 交接結論

這是已完成的獨立網頁版 AI 貼圖工作室。當前剩餘外部依賴是 AI 服務額度恢復後的生成重試，而非程式流程阻塞。若 GPT 要繼續開發，請優先在既有架構中增加貼圖尺寸／安全區預覽、專案列表與生成重試的可觀測性，並保留本文件第 6 節的產品與安全限制。
