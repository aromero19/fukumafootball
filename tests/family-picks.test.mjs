import assert from "node:assert/strict";
import test from "node:test";
import { hasEveryOpenPick, submissionPicks } from "../src/lib/picks.mjs";

const games = [
  { game_id: 12, win_team_id: 34 },
  { game_id: 4, win_team_id: 10 },
  { game_id: 18, win_team_id: 34 },
];

test("a family submission requires every open game but not locked games", () => {
  assert.equal(hasEveryOpenPick(games, { 12: 1 }), false);
  assert.equal(hasEveryOpenPick(games, { 12: 1, 18: 2 }), true);
});

test("submission payloads retain selected locked games and use deterministic ordering", () => {
  assert.deepEqual(submissionPicks({ 18: 2, 4: 10, 12: 1 }), [
    { game_id: 4, team_id: 10 },
    { game_id: 12, team_id: 1 },
    { game_id: 18, team_id: 2 },
  ]);
});


import { httpsImageUrl, imageCandidates } from "../src/lib/theme-images.mjs";
test("image URLs reject unsafe protocols, credentials and malformed input", () => {
  for (const url of ["http://example.test/a", "javascript:alert(1)", "data:image/png;base64,a", "https://user:secret@example.test/a", "https://", "https://example.test/a b", "https://example.test/" + "a".repeat(2048), null]) assert.equal(httpsImageUrl(url), null);
  assert.equal(httpsImageUrl("https://example.test/team.png"), "https://example.test/team.png");
});
test("images prefer selected theme then Default, skipping inactive and unsafe images", () => {
  const images = [
    { team_id: 10, theme_id: 2, active: true, thumbnail_url: "https://example.test/thumb", image_url: "https://example.test/retro" },
    { team_id: 10, theme_id: 1, active: true, image_url: "https://example.test/default" },
  ];
  assert.deepEqual(imageCandidates(images, 10, 2, 1), ["https://example.test/thumb", "https://example.test/retro", "https://example.test/default"]);
  assert.deepEqual(imageCandidates(images, 10, 1, 1), ["https://example.test/default"]);
  assert.deepEqual(imageCandidates(images, 11, 2, 1), []);
  images[0].active = false;
  assert.deepEqual(imageCandidates(images, 10, 2, 1), ["https://example.test/default"]);
  images[1].image_url = "javascript:alert(1)";
  assert.deepEqual(imageCandidates(images, 10, 2, 1), []);
});

import { submitWithRetry } from "../src/lib/picks.mjs";
import { kickoffTime,integer,emailAddress } from "../src/lib/validation.mjs";
test("transaction retries reuse the exact payload and are bounded",async()=>{
 const payload={p_request_id:"stable",p_picks:[{game_id:1,team_id:2}]};let count=0;const waits=[];
 const result=await submitWithRetry(async p=>{assert.equal(p,payload);return ++count<3?{error:{code:"40P01"}}:{data:"saved",error:null};},payload,async ms=>waits.push(ms));
 assert.equal(result.data,"saved");assert.equal(count,3);assert.deepEqual(waits,[150,300]);
 count=0;await submitWithRetry(async()=>{count++;return {error:{code:"40001"}};},payload,async()=>{});assert.equal(count,3);
 count=0;await submitWithRetry(async()=>{count++;return {error:{code:"23514"}};},payload,async()=>assert.fail());assert.equal(count,1);
});
test("operational inputs reject ambiguous kickoff, malformed IDs and email",()=>{
 assert.throws(()=>kickoffTime("2026-09-13T14:25"),/time zone/);
 assert.equal(kickoffTime("2026-09-13T14:25-06:00"),"2026-09-13T20:25:00.000Z");
 assert.equal(kickoffTime(""),null);
 const form=new FormData();form.set("id","1.5");assert.throws(()=>integer(form,"id"));form.set("id","9007199254740993");assert.throws(()=>integer(form,"id"));
 assert.throws(()=>emailAddress("x@example.test\nBcc: other@example.test"));
});

import {validateSubmission,createSubmissionLimiter} from '../src/lib/submission.mjs';
test('submission boundary rejects excessive or duplicate picks and preserves retry order',()=>{
 const input={p_entry_id:1,p_theme_id:1,p_year:2026,p_week:1,p_request_id:'20000000-0000-0000-0000-000000000001',p_picks:[{game_id:2,team_id:10},{game_id:1,team_id:16}]};
 assert.deepEqual(validateSubmission(input),input);
 assert.throws(()=>validateSubmission({...input,p_picks:[input.p_picks[0],input.p_picks[0]]}),/duplicate/);
 assert.throws(()=>validateSubmission({...input,p_picks:Array(33).fill(input.p_picks[0])}),/Too many/);
 assert.throws(()=>validateSubmission({...input,p_entry_id:-1}),/valid/);
});
test('submission rate guard bounds bursts and expires windows',()=>{
 const allow=createSubmissionLimiter();for(let i=0;i<30;i++)assert.equal(allow('client',100),true);assert.equal(allow('client',100),false);assert.equal(allow('another',100),true);assert.equal(allow('client',60101),true);
});
