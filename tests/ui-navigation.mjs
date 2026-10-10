import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
const icons=new Proxy({}, {get:(_,key)=> typeof key==='string'?function Icon(){return null}:undefined});
const GroupedMenuStub=function GroupedMenuStub(){return null};
const LinkStub=function LinkStub(){return null};
function load(file,session,pathname='/dashboard',grouped=GroupedMenuStub){
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const mod={exports:{}};
 const deps={
  'react':{useState:initial=>[initial===null?pathname:typeof initial==='function'?initial():initial,()=>{}],useEffect:()=>{},useRef:()=>({current:null}),useId:()=>':test:'},
  'react-dom':{createPortal:node=>node},'react/jsx-runtime':jsx,
  'next/link':LinkStub,'next/navigation':{usePathname:()=>pathname},
  'next-auth/react':{useSession:()=>({data:{user:session}})},
  './GroupedMenu':{__esModule:true,default:grouped}
 };
 new Function('require','module','exports',code)(name=>name==='lucide-react'?icons:deps[name]||(()=>{throw Error('Unexpected dependency '+name)})(),mod,mod.exports);
 return mod.exports;
}
function walk(node,visit){
 if(!node||typeof node!=='object')return;
 if(Array.isArray(node)){node.forEach(child=>walk(child,visit));return;}
 visit(node);
 if(node.props)walk(node.props.children,visit);
}
function itemsFor(file,session){
 global.document={getElementById:()=>({}),body:{}};
 const element=load(file,session).default({});let found;
 walk(element,n=>{if(n.type===GroupedMenuStub)found=n.props.items;});
 delete global.document;
 assert.ok(found,'menu items should be supplied to grouped nav');return found;
}
const paths=items=>new Set(items.map(item=>item.path));
test('all existing role menus and finance/config/SMS filters remain intact',()=>{
 for(const file of ['src/components/Sidebar.tsx','src/components/MobileNav.tsx']){
  const admin=paths(itemsFor(file,{id:'admin-1',role:'ADMIN'}));
  const teacher=paths(itemsFor(file,{id:'T1',role:'STAFF',staffRole:'TEACHER'}));
  const accountantTeacher=paths(itemsFor(file,{id:'T2',role:'STAFF',staffRole:'ACCOUNTANT_TEACHER'}));
  const accountant=paths(itemsFor(file,{id:'A1',role:'ACCOUNTANT'}));
  const parent=paths(itemsFor(file,{id:'P1',role:'PARENT'}));
  const student=paths(itemsFor(file,{id:'S1',role:'STUDENT'}));
  for(const p of ['/payments','/configuration','/assessment-format','/sms-notifications'])assert.ok(admin.has(p),file+' admin '+p);
  for(const p of ['/payments','/configuration','/assessment-format','/sms-notifications'])assert.equal(teacher.has(p),false,file+' teacher '+p);
  assert.ok(accountantTeacher.has('/payments'));
  assert.equal(accountantTeacher.has('/sms-notifications'),false);
  assert.deepEqual([...accountant].sort(),['/dashboard','/payments','/change-password','/help'].sort());
  assert.ok(parent.has('/students')&&parent.has('/payments')&&!parent.has('/staff'));
  assert.ok(student.has('/my-exams')&&!student.has('/parents')&&!student.has('/payments'));
 }
});
test('menu-specific NEW indicators and role-only links are retained',()=>{
 assert.ok(itemsFor('src/components/Sidebar.tsx',{id:'S1',role:'STUDENT'}).some(i=>i.path==='/my-exams'&&i.isNew));
 assert.ok(itemsFor('src/components/MobileNav.tsx',{id:'S1',role:'STUDENT'}).some(i=>i.path==='/exam-practice'&&i.isNew));
 assert.ok(itemsFor('src/components/MobileNav.tsx',{id:'S1',role:'STUDENT'}).some(i=>i.path==='/cbt'));
 assert.ok(itemsFor('src/components/Sidebar.tsx',{id:'admin-1',role:'ADMIN'}).some(i=>i.path==='/entrance-exam'));
});
test('all menu paths have a named group; nested routes match a current link',()=>{
 const group=load('src/components/GroupedMenu.tsx',{},'/dashboard',GroupedMenuStub);
 for(const file of ['src/components/Sidebar.tsx','src/components/MobileNav.tsx'])for(const role of ['ADMIN','STAFF','ACCOUNTANT','STUDENT','PARENT']){
  const session={id:role==='ADMIN'?'admin-1':'X',role};
  for(const item of itemsFor(file,session)){
   assert.ok(group.GROUPS.includes(group.groupForPath(item.path)));
   if(item.path==='/dashboard')assert.equal(group.groupForPath(item.path),'Overview');
  }
 }
 assert.equal(group.isCurrentPath('/students/123','/students'),true);
 assert.equal(group.isCurrentPath('/students-old','/students'),false);
 assert.equal(group.isCurrentPath('/reportsheet/DIT-STU-1','/broadsheet'),true);
});
test('grouped nav expands active group and marks current nested link',()=>{
 const group=load('src/components/GroupedMenu.tsx',{},'/dashboard',GroupedMenuStub);
 const items=itemsFor('src/components/Sidebar.tsx',{id:'admin-1',role:'ADMIN'});
 const tree=group.default({items,pathname:'/students/123',idPrefix:'test'});
 const nodes=[];walk(tree,n=>nodes.push(n));
 const headings=nodes.filter(n=>n.type==='button'&&n.props?.['aria-expanded']!==undefined);
 const textOf=n=>typeof n==='string'?n:Array.isArray(n)?n.map(textOf).join(''):n?.props?textOf(n.props.children):'';
 const admissions=headings.find(n=>textOf(n).includes('Admissions & People'));
 assert.equal(admissions?.props['aria-expanded'],true);
 const active=nodes.find(n=>n.type===LinkStub&&n.props.href==='/students');
 assert.equal(active?.props['aria-current'],'page');
});
test('drawer dialog, keyboard, backdrop, route-close and zoom code remain present',()=>{
 const mobile=fs.readFileSync('src/components/MobileNav.tsx','utf8');
 for(const snippet of ['role="dialog"','aria-modal="true"','Escape','event.shiftKey','getClientRects','document.body.style.overflow','onNavigate={closeMenu}','z-[99999]'])
  assert.ok(mobile.includes(snippet),snippet);
 const layout=fs.readFileSync('src/app/layout.tsx','utf8');
 assert.doesNotMatch(layout,/maximumScale|userScalable/);
 const login=fs.readFileSync('src/app/login/page.tsx','utf8');
 assert.match(login,/role="alert"/);assert.match(login,/autoComplete="username"/);assert.match(login,/autoComplete="current-password"/);
});
