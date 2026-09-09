// Tool contract test.
//
// The README promises two tools with specific names and required parameters. The upstream list
// can change without a single commit here, and the README would start lying silently. These
// checks catch that before a user does.
//
// One live call serves two checks. Listing tools accepts any non-empty key, so a contract check
// that only lists tools stays green with a revoked or mistyped key. The same response also
// carries the review count that the README sends readers here for, rather than to the place
// tool, so both are asserted against one call. That call costs 10 credits, which is the price
// of a canary that can fail for the right reason.
//
// Run: HASDATA_API_KEY=your_key_here npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';

const ENDPOINT = 'https://mcp.hasdata.com/api/mcp?apis=yellowpages';
const KEY = process.env.HASDATA_API_KEY;
const TIMEOUT_MS = 30_000;

const EXPECTED = {
    hasdata_yellowpages_search_getSearchResults: ['keyword', 'location'],
    hasdata_yellowpages_place_getPlaceDetails: ['url'],
};

// A streamable HTTP body arrives either as plain JSON or as server-sent events. One SSE event
// can span several data: lines, several events can share one response, and a server is free to
// send progress notifications before the answer. So collect every event and pick the message
// carrying our request id instead of trusting the first data: line.
function parseRpc(raw, id) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);

    const messages = [];
    for (const event of trimmed.split(/\r?\n\r?\n+/)) {
        const data = event
            .split(/\r?\n/)
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).replace(/^ /, ''))
            .join('\n');
        if (!data || data === '[DONE]') continue;
        try {
            messages.push(JSON.parse(data));
        } catch {
            // A keep-alive or a partial event is not our response.
        }
    }
    assert.ok(messages.length, `no JSON-RPC message in the response: ${raw.slice(0, 300)}`);
    const match = messages.find((m) => m.id === id);
    assert.ok(match, `no message with id ${id} in the response: ${raw.slice(0, 300)}`);
    return match;
}

let nextId = 1;

async function rpc(method, params = {}) {
    // The CI key sits on the free plan, where concurrency is 1. When several of
    // these repos are pushed at once their contract runs collide, and HasData
    // answers 429 with code concurrency_limit straight away rather than queueing.
    // That is a plan limit, not a broken contract, so the call is retried before
    // the test gives up. A 401 still fails on the first attempt.
    for (let attempt = 1; ; attempt++) {
        const id = nextId++;
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'x-api-key': KEY,
                'Content-Type': 'application/json',
                // The server answers over streamable HTTP, so accept both a plain body and a stream.
                Accept: 'application/json, text/event-stream',
            },
            body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        assert.equal(res.status, 200, `${method} returned ${res.status}`);
        const raw = await res.text();
        if (raw.includes('concurrency_limit') && attempt < 5) {
            await new Promise((r) => setTimeout(r, attempt * 4000));
            continue;
        }
        return { raw, body: parseRpc(raw, id) };
    }
}

// One network round trip for every test that needs the list.
let toolsPromise;
function listTools() {
    toolsPromise ??= rpc('tools/list').then(({ body }) => {
        assert.ok(body.result?.tools, 'the response carried no result.tools');
        return body.result.tools;
    });
    return toolsPromise;
}

// One paid round trip, shared by the checks that need a real answer.
let searchPromise;
function liveSearch() {
    searchPromise ??= rpc('tools/call', {
        name: 'hasdata_yellowpages_search_getSearchResults',
        arguments: { keyword: 'plumber', location: 'Austin, TX' },
    });
    return searchPromise;
}

const live = { skip: KEY ? false : 'HASDATA_API_KEY is not set, skipping the live checks' };

test('apis=yellowpages exposes the documented tools and nothing else', live, async () => {
    const tools = await listTools();
    const names = tools.map((t) => t.name).sort().join(', ');
    assert.equal(
        tools.length,
        Object.keys(EXPECTED).length,
        `expected ${Object.keys(EXPECTED).length} tools, got ${tools.length}: ${names}`
    );
});

test('the tool names have not changed', live, async () => {
    const tools = await listTools();
    const names = new Set(tools.map((t) => t.name));
    for (const expected of Object.keys(EXPECTED)) {
        assert.ok(names.has(expected), `tool ${expected} is missing from the list`);
    }
});

test('every tool still declares its required parameters', live, async () => {
    const tools = await listTools();
    for (const tool of tools) {
        const required = tool.inputSchema?.required ?? [];
        const want = EXPECTED[tool.name];
        assert.ok(want, `tool ${tool.name} is not covered by this test`);
        for (const param of want) {
            assert.ok(
                required.includes(param),
                `${tool.name} should require ${param}, declares: ${required.join(', ') || 'nothing'}`
            );
        }
    }
});

test('every tool carries a description', live, async () => {
    const tools = await listTools();
    for (const tool of tools) {
        assert.ok(
            (tool.description || '').trim().length > 20,
            `${tool.name} has an empty or near-empty description`
        );
    }
});

test('the search tool still offers the documented sort orders and domains', live, async () => {
    const tools = await listTools();
    const search = tools.find((t) => t.name === 'hasdata_yellowpages_search_getSearchResults');
    assert.ok(search, 'the search tool is missing from the list');
    const props = search.inputSchema?.properties ?? {};
    const sorts = props.sort?.enum ?? [];
    for (const value of ['default', 'distance', 'averageRating', 'name']) {
        assert.ok(sorts.includes(value), `sort no longer accepts ${value}, offers: ${sorts.join(', ') || 'no enum'}`);
    }
    const domains = props.domain?.enum ?? [];
    for (const value of ['www.yellowpages.com', 'www.yellowpages.ca']) {
        assert.ok(domains.includes(value), `domain no longer accepts ${value}, offers: ${domains.join(', ') || 'no enum'}`);
    }
});

test('the key is accepted by HasData', live, async () => {
    const { raw } = await liveSearch();
    assert.ok(!raw.includes('401 Unauthorized'), 'HasData rejected the key');
    assert.ok(!raw.includes('"isError":true'), `the tool call failed: ${raw.slice(0, 300)}`);
});

// The README sends readers to the search tool for a review count, because the place tool
// returns ratings.reviews equal to the rating rather than a count. That advice depends on the
// search tool carrying a real count on the results that have one, so it is checked for real.
// Not every listing has a rating, which is why this asserts on the subset that does.
test('a live search still carries a real review count where it carries a rating', live, async () => {
    const { body } = await liveSearch();
    const text = body.result?.content?.[0]?.text ?? '';
    const payload = JSON.parse(text);
    const results = payload.json?.organicResults;
    assert.ok(Array.isArray(results) && results.length, `no organicResults in the response: ${text.slice(0, 300)}`);

    const rated = results.filter((r) => r.rating !== undefined);
    assert.ok(rated.length, 'not one result carried a rating, so the review count cannot be checked');

    for (const r of rated) {
        assert.equal(typeof r.reviews, 'number', `a rated result carried no numeric reviews count: ${JSON.stringify(r).slice(0, 200)}`);
        assert.ok(Number.isInteger(r.reviews), `reviews should be a whole count, got ${r.reviews}`);
    }

    // A count that mirrors the rating on every rated result is the failure the README warns
    // about on the place tool. If it reaches the search tool too, the advice has to change.
    assert.ok(
        rated.some((r) => r.reviews !== r.rating),
        'every rated result reported reviews equal to rating, which means the count is gone here too'
    );
});
