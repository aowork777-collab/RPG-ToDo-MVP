import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createDefaultState, normalizeState } from '../src/model.mjs';
import { addTask, toggleTaskState } from '../src/actions.mjs';
import { generateTodayTasks } from '../src/features/daily/actions.mjs';
import { isScheduled } from '../src/features/daily/schedule.mjs';
import { parseBulk, recentTasks, saveReview } from '../src/features/planning/state.mjs';
import { reminderDue, calendarReminder } from '../src/features/planning/reminders.mjs';
import { mountPlanning } from '../src/features/planning/ui.mjs';
import { dateKey } from '../src/features/habits/state.mjs';

test('Legacy daily tasks keep repeating; weekly/interval schedules survive normalization',()=>{
 const s=normalizeState({totalXp:140,tasks:[],daily:{templates:[{id:'old',title:'daily',enabled:true},{id:'week',title:'weekly',schedule:{kind:'weekly',weekdays:[1,4]}},{id:'interval',title:'interval',schedule:{kind:'interval',interval:3,start:'2026-01-30'}}]}});
 generateTodayTasks(s,'2026-02-02'); assert.deepEqual(s.tasks.map(t=>t.title),['daily','weekly','interval']);
 generateTodayTasks(s,'2026-02-02'); assert.equal(s.tasks.length,3);
 generateTodayTasks(s,'2026-02-03'); assert.deepEqual(s.tasks.map(t=>t.title),['daily']);assert.equal(s.daily.history.length,3);assert.equal(s.totalXp,140);
 assert.equal(isScheduled({schedule:{kind:'interval',interval:2,start:'2026-03-07'}},'2026-03-09'),true);
 assert.equal(isScheduled({schedule:{kind:'interval',interval:2,start:'2026-03-07'}},'2026-03-06'),false);
 assert.equal(isScheduled({},'2026-02-30'),false);
});
test('Bulk limits never silently truncate; history clones retain only intended task defaults',()=>{
 assert.deepEqual(parseBulk('  one\r\n\n two\n one '),['one','two','one']);
 assert.throws(()=>parseBulk('x'.repeat(61)));assert.throws(()=>parseBulk('a\n'.repeat(51)));assert.throws(()=>parseBulk(' '));
 const s=createDefaultState();const a=addTask(s,{title:'one',difficulty:3,dueDate:'2020-01-01'});toggleTaskState(s,a.id);
 addTask(s,{title:'one',difficulty:3});assert.equal(recentTasks(s).length,1);
 const b=addTask(s,{title:a.title,difficulty:a.difficulty});assert.equal(b.completed,false);assert.equal(b.dueDate,'');assert.equal(b.earnedXp,0);assert.notEqual(a.id,b.id);
});
test('Review preserves XP, distinguishes skip, and repeated carryover is idempotent',()=>{
 const s=createDefaultState(),today=dateKey();s.totalXp=123;
 const t=addTask(s,{title:'routine',difficulty:2});Object.assign(t,{dailyTemplateId:'daily',dateKey:today});
 saveReview(s,today,'rest',{[t.id]:'skip'});assert.equal(s.planning.reviews[today].decisions[0].choice,'skip');assert.equal(t.completed,false);
 saveReview(s,today,'next',{[t.id]:'tomorrow'});saveReview(s,today,'again',{[t.id]:'tomorrow'});
 saveReview(s,today,'change',{[t.id]:'skip'});saveReview(s,today,'next',{[t.id]:'tomorrow'});
 assert.equal(s.tasks.length,2);assert.equal(s.totalXp,123);
 const restored=normalizeState(JSON.parse(JSON.stringify(s)));assert.equal(restored.planning.reviews[today].note,'next');assert.equal(restored.tasks.length,2);
});
test('Reminder checks selected local weekday/minute, defaults off, exports weekly calendar alarm',()=>{
 const r={enabled:true,time:'20:00',weekdays:[1,4]}, now=new Date(2026,8,24,20,0);
 assert.equal(reminderDue(r,now),true);assert.equal(reminderDue({...r,enabled:false},now),false);assert.equal(reminderDue(r,new Date(2026,8,24,20,1)),false);
 const ics=calendarReminder(r,now);assert.match(ics,/DTSTART:20260928T200000/);assert.match(ics,/RRULE:FREQ=WEEKLY;BYDAY=MO,TH/);assert.match(ics,/BEGIN:VALARM/);
 assert.equal(createDefaultState().planning.reminder.enabled,false);
});
test('Bulk UI requires review, keeps draft on failed save, and commits once',t=>{
 const dom=new JSDOM('<nav id="planning"></nav>');
 for(const key of ['window','document','FormData']){const previous=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});t.after(()=>previous?Object.defineProperty(globalThis,key,previous):delete globalThis[key]);}
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};t.after(()=>dom.window.close());
 const state=createDefaultState();let canSave=false,commits=0;
 mountPlanning({getState:()=>state,commit:change=>{commits++;if(!canSave)return false;change(state);return true;},notify:()=>{}});
 document.querySelectorAll('#planning button')[1].click();const form=document.querySelector('dialog form');const input=form.querySelector('textarea');input.value='one\ntwo';
 const submit=()=>form.dispatchEvent(new window.Event('submit',{cancelable:true}));submit();assert.equal(commits,0);assert.equal(form.querySelectorAll('li').length,2);
 submit();assert.equal(state.tasks.length,0);assert.equal(input.value,'one\ntwo');assert.match(document.querySelector('[role=status]').textContent,/保存できません/);
 canSave=true;submit();assert.equal(state.tasks.length,2);assert.equal(state.totalXp,0);assert.equal(document.querySelector('dialog').open,false);
});
