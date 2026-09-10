import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";
import { routeExample } from "./routeExamples.js";

type RouteInfo = {
    method: string;
    path: string;
};

type Layer = {
    name?: string;
    method?: string;
    route?: {
        path: string;
        methods: Record<string, boolean>;
        stack?: Layer[];
    };
    handle?: { stack?: Layer[] };
    regexp?: ExpressRegExp;
};

type ExpressRegExp = RegExp & { fast_slash?: boolean };

function splitPath(thing: string | ExpressRegExp | undefined): string[] {
    if (!thing) {
        return [];
    }

    if (typeof thing === "string") {
        return thing.split("/").filter(Boolean);
    }

    if (thing.fast_slash) {
        return [];
    }

    const raw = thing.toString()
        .replace("\\/?", "")
        .replace("(?=\\/|$)", "$");
    const match = raw.match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);

    if (!match?.[1]) {
        const fallback = raw.match(/^\/\^\\\/([^\\/?$]+)/);

        if (fallback?.[1]) {
            return [fallback[1].replace(/\\(.)/g, "$1")];
        }

        return [];
    }

    return match[1].replace(/\\(.)/g, "$1").split("/").filter(Boolean);
}

function joinParts(parts: string[]): string {
    const normalized = `/${parts.filter(Boolean).join("/")}`.replace(/\/+/g, "/");

    return normalized === "" ? "/" : normalized;
}

function walk(layers: Layer[] | undefined, prefix: string[], acc: RouteInfo[]): void {
    if (!layers) {
        return;
    }

    for (const layer of layers) {
        if (layer.route) {
            const routeParts = [...prefix, ...splitPath(layer.route.path)];
            const methods = Object.keys(layer.route.methods ?? {})
                .filter((method) => layer.route?.methods[method])
                .map((method) => method.toUpperCase());

            for (const method of methods) {
                if (method === "HEAD") {
                    continue;
                }

                acc.push({ method, path: joinParts(routeParts) });
            }

            continue;
        }

        if (layer.name === "router" && layer.handle?.stack) {
            walk(layer.handle.stack, [...prefix, ...splitPath(layer.regexp)], acc);
        }
    }
}

function displayPath(routePath: string): string {
    return routePath.replace(/:([A-Za-z0-9_]+)/g, "[$1]");
}

function fileSlug(routePath: string): string {
    const withoutApi = routePath.replace(/^\/api\/?/, "");
    const first = withoutApi.split("/").filter(Boolean)[0] ?? "root";
    const slug = first.replace(/:([A-Za-z0-9_]+)/g, "$1");

    return `_${slug}.md`;
}

function uniqueRoutes(routes: RouteInfo[]): RouteInfo[] {
    const seen = new Set<string>();
    const result: RouteInfo[] = [];

    for (const route of routes) {
        const key = `${route.method} ${route.path}`;

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(route);
    }

    return result.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

export async function documentRoutes(app: Express): Promise<string[]> {
    const router = (app as unknown as { _router?: { stack?: Layer[] } })._router;
    const acc: RouteInfo[] = [];

    walk(router?.stack, [], acc);

    const routes = uniqueRoutes(
        acc.filter((route) => route.path === "/health" || route.path.startsWith("/api"))
    );
    const groups = new Map<string, RouteInfo[]>();

    for (const route of routes) {
        const slug = fileSlug(route.path);
        const list = groups.get(slug) ?? [];

        list.push(route);
        groups.set(slug, list);
    }

    const outDir = path.resolve(process.cwd(), "docs/routes");

    fs.mkdirSync(outDir, { recursive: true });

    const written: string[] = [];

    for (const [slug, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const samplePath = group[0]?.path ?? "/";
        const parts = samplePath.split("/").filter(Boolean);
        const titlePath = parts[0] === "api" && parts[1]
            ? `/api/${parts[1]}`
            : `/${parts[0] ?? ""}`;
        const lines: string[] = [];

        lines.push(`# ${titlePath || "/"}`);
        lines.push("");

        for (const route of group) {
            lines.push(`- \`${route.method} ${displayPath(route.path)}\``);
        }

        lines.push("");

        for (const route of group) {
            const shown = `${route.method} ${displayPath(route.path)}`;
            const example = routeExample(route.method, route.path);

            lines.push(`## ${shown}`);
            lines.push("");
            lines.push("Sent data");
            lines.push("");
            lines.push("```json");
            lines.push(JSON.stringify(example.sent, null, 2));
            lines.push("```");
            lines.push("");
            lines.push("Response");
            lines.push("");
            lines.push("```json");
            lines.push(JSON.stringify(example.response, null, 2));
            lines.push("```");
            lines.push("");
        }

        const filePath = path.join(outDir, slug);

        fs.writeFileSync(filePath, `${lines.join("\n").trim()}\n`);
        written.push(filePath);
    }

    return written;
}
