import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

test('browser bundle activates and registers native main, sidebar and retained settings', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url),'utf8'))
  let definition, client, active='en'
  const react={createElement:(type,props,...children)=>({type,props,children}),useEffect(){}}
  runInNewContext(readFileSync(new URL('../lib/client.js',import.meta.url),'utf8'),{
    window:{__ModuleLoader__:{load(entry){definition=entry;client=entry.factory(name=>{
      if(name==='react')return react
      throw new Error('Unexpected eager UI dependency: '+name)
    })}}}
  })
  assert.equal(definition.id,pkg.name)
  const registrations=[]
  const locale={getSnapshot:()=>({active})}
  client.apply({locale,get:()=>locale,effect(fn,label){if(label?.endsWith(': locale'))return fn()},slots:{inject(_name,fn){fn()},register(meta,component){registrations.push({meta,component});return ()=>{}}}})
  const main=registrations.find(row=>row.meta.name==='main')
  const sidebar=registrations.find(row=>row.meta.name==='sidebar.panellist')
  const settings=registrations.find(row=>row.meta.name==='settings.section')
  assert.ok(main);assert.ok(sidebar);assert.ok(settings)
  assert.equal(main.meta.key,sidebar.meta.id)
  assert.equal(main.meta.inject().workbench,true)
  assert.equal(typeof main.component,'function')
  assert.equal(typeof settings.component,'function')
  const en=sidebar.meta.label();assert.ok(en);assert.doesNotMatch(en,/[\u3400-\u9fff]/)
  active='zh';assert.ok(sidebar.meta.label())
})
