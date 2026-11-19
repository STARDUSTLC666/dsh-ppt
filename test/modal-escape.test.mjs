import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const source = readFileSync(new URL('../templates/workbench-ui.js', import.meta.url), 'utf8')
function resolveHostPrimitives(React, requireHost) {
  const marker = 'function resolveHostPrimitives(customRequire = requireFn) {'
  assert.ok(source.includes(marker))
  const instrumented = source.replace(marker, () => marker + '; globalThis.probe = resolveHostPrimitives;')
  const context = { React, requireHost }
  runInNewContext(instrumented + String.fromCharCode(10) + 'createWorkbenchUI(React, requireHost).Dialog({ onClose() {} })', context)
  return context.probe(requireHost)
}
const React={Fragment:'fragment',createElement(type,props,...children){return {type,props:{...props,children}}}}
function setup(onKeyDownCapture){
 const P=resolveHostPrimitives(React,()=>undefined)
 const closed={modal:0,menu:0}
 const modal=P.Modal({open:true,onClose:()=>closed.modal++,onKeyDownCapture})
 const menu=P.Menu({open:true,onClose:()=>closed.menu++})
 const menuElement=menu.props.children.find(node=>node?.props?.role==='menu')
 return {closed,modal,menuElement}
}
function escape(modal,child){
 const event={key:'Escape',defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true}}
 // DOM/React capture is delivered before a child's bubble handler.
 modal.props.onKeyDownCapture?.(event)
 if(!event.stopped)child?.(event)
 if(!event.stopped)modal.props.onKeyDown?.(event)
 return event
}

test('Escape handled by a nested menu does not close its enclosing fallback modal',()=>{
 const f=setup()
 escape(f.modal,f.menuElement.props.onKeyDown)
 assert.equal(f.closed.menu,1)
 assert.equal(f.closed.modal,0,'menu Escape must not discard the enclosing form')
})
test('unhandled Escape closes the fallback modal once and stops propagation',()=>{
 const f=setup(),event=escape(f.modal)
 assert.equal(f.closed.modal,1)
 assert.equal(event.stopped,true)
})
test('custom capture handlers can prevent the modal default without being lost',()=>{
 let captured=0
 const f=setup(event=>{captured++;event.preventDefault()})
 escape(f.modal)
 assert.equal(captured,1)
 assert.equal(f.closed.modal,0)
})
