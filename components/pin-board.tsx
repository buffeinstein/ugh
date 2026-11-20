"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { shuffle } from "@/lib/shuffle";
import type { Pin, PinsResponse } from "@/lib/types";

const DEFAULT_COUNT = 100;

const OAUTH_ERRORS: Record<string, string> = {
  oauth_not_configured: "PINTEREST_APP_ID / PINTEREST_APP_SECRET are not set.",
  oauth_denied: "Pinterest authorization was cancelled or failed.",
  oauth_state: "OAuth state mismatch. Please try connecting again.",
  oauth_exchange: "Could not exchange the OAuth code for a token. Check the app secret and redirect URI.",
};

type State =
  | { kind: "loading" }
  | { kind: "connect"; message?: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: PinsResponse };

export function PinBoard() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [order, setOrder] = useState<Pin[]>([]);
  const [countText, setCountText] = useState(String(DEFAULT_COUNT));
  const [tokenText, setTokenText] = useState("");

  const load = useCallback(async (opts: { mock?: boolean; oauthError?: string } = {}) => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(opts.mock ? "/api/pins?mock=1" : "/api/pins", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        const message = body.error === "not_connected" ? opts.oauthError : body.error;
        setState({ kind: "connect", message });
        return;
      }
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      const data = body as PinsResponse;
      setOrder(shuffle(data.pins));
      setState({ kind: "ready", data });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Something went wrong." });
    }
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) window.history.replaceState(null, "", "/");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load({ oauthError: code ? (OAUTH_ERRORS[code] ?? "Connection failed.") : undefined });
  }, [load]);

  const submitToken = async () => {
    const res = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenText }),
    });
    if (!res.ok) return setState({ kind: "connect", message: "Paste a token first." });
    setTokenText("");
    void load();
  };

  const disconnect = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    void load();
  };

  const poolSize = order.length;
  const parsed = Number.parseInt(countText, 10);
  const requested = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_COUNT;
  const shown = Math.min(requested, poolSize);
  const visible = useMemo(() => order.slice(0, shown), [order, shown]);

  if (state.kind === "loading") {
    return (
      <Shell>
        <p className="mb-4 text-sm text-muted-foreground">Loading every pin from every board. Large accounts can take a minute.</p>
        <Grid>
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="mb-4 w-full break-inside-avoid" style={{ height: 180 + ((i * 53) % 4) * 50 }} />
          ))}
        </Grid>
      </Shell>
    );
  }

  if (state.kind === "connect") {
    return (
      <Shell>
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Connect Pinterest</CardTitle>
            <CardDescription>
              Pull all pins from all your boards (including secret ones) into one random pool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
            <Button className="w-full" size="lg" render={<a href="/api/auth/login" />} nativeButton={false}>
              Connect with Pinterest (OAuth)
            </Button>
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium">Or paste an access token</label>
              <div className="flex gap-2">
                <Input
                  id="token"
                  type="password"
                  autoComplete="off"
                  placeholder="pina_..."
                  value={tokenText}
                  onChange={(e) => setTokenText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitToken()}
                />
                <Button variant="secondary" onClick={submitToken}>Use token</Button>
              </div>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => load({ mock: true })}>
              Try with sample data
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (state.kind === "error") {
    return (
      <Shell>
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Couldn&apos;t load your pins</CardTitle>
            <CardDescription role="alert">{state.message}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => load()}>Try again</Button>
            <Button variant="outline" onClick={disconnect}>Change token</Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const { data } = state;
  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="count" className="text-sm font-medium">Pins to show</label>
          <Input
            id="count"
            type="number"
            min={1}
            inputMode="numeric"
            className="w-28"
            value={countText}
            onChange={(e) => setCountText(e.target.value)}
          />
        </div>
        <Button size="lg" onClick={() => setOrder(shuffle(order))} disabled={poolSize === 0}>
          Reshuffle
        </Button>
        <Button size="lg" variant="outline" onClick={() => load({ mock: data.source === "mock" })}>
          Reload pins
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {data.source === "mock" && <Badge variant="secondary">Sample data</Badge>}
          <Badge variant="outline">
            {poolSize.toLocaleString()} pins loaded from {data.boards} {data.boards === 1 ? "board" : "boards"}
          </Badge>
          {data.source === "mock" ? (
            <Button variant="ghost" size="sm" onClick={() => load()}>Connect Pinterest</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={disconnect}>Disconnect</Button>
          )}
        </div>
      </div>

      {poolSize === 0 ? (
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>No pins found</CardTitle>
            <CardDescription>
              Your account returned {data.boards} {data.boards === 1 ? "board" : "boards"} but no pins with images.
              Check that the token has the pins:read scopes and that your boards have pins.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Showing {shown.toLocaleString()} random {shown === 1 ? "pin" : "pins"}
            {requested > poolSize && ` (capped at pool size of ${poolSize.toLocaleString()})`}.
          </p>
          <Grid>
            {visible.map((pin) => (
              <a
                key={pin.id}
                href={pin.url}
                target="_blank"
                rel="noopener noreferrer"
                title={pin.title || pin.board}
                className="group relative mb-4 block break-inside-avoid overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 transition hover:ring-2 hover:ring-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pin.image}
                  alt={pin.title || "Pinterest pin"}
                  width={pin.width}
                  height={pin.height}
                  loading="lazy"
                  className="h-auto w-full"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 text-xs text-white opacity-0 transition group-hover:opacity-100">
                  {pin.title || pin.board}
                </span>
              </a>
            ))}
          </Grid>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Random Pins</h1>
      <p className="mb-6 text-sm text-muted-foreground">A uniform shuffle of every pin across every board.</p>
      {children}
    </main>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">{children}</div>;
}

