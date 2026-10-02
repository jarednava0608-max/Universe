// Editor de Notas con formato (como Notas del iPhone): títulos, negritas, colores,
// listas, tareas, tablas, citas y líneas. Todo local (TipTap), sin servicios.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { Highlight } from '@tiptap/extension-highlight'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'
import { NodeLink, BibleRefs } from './noteExtensions.js'
import NodePicker from '../components/NodePicker.jsx'
import { openRef } from '../lib/verses.js'

// Colores que se leen bien en negro y en blanco.
export const TEXT_COLORS = [['#ef4444', 'Rojo'], ['#f59e0b', 'Naranja'], ['#22c55e', 'Verde'], ['#3b82f6', 'Azul'], ['#a855f7', 'Morado']]
export const MARK_COLORS = [['rgba(250, 204, 21, 0.4)', 'Amarillo'], ['rgba(34, 197, 94, 0.32)', 'Verde'], ['rgba(59, 130, 246, 0.32)', 'Azul'], ['rgba(236, 72, 153, 0.32)', 'Rosa'], ['rgba(168, 85, 247, 0.32)', 'Morado']]

const P = {
  aa: 'M4 18 9 6l5 12M5.6 14h6.8M15 18v-5.5a2.5 2.5 0 0 1 5 0V18M15 15.5h5',
  check: 'M4 6.5 5.5 8 8 5.5M4 12.5 5.5 14 8 11.5M4 18.5 5.5 20 8 17.5M11 7h9M11 13h9M11 19h9',
  bullet: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  ordered: 'M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M3.5 9h3M3.6 13.2a1.3 1.3 0 0 1 2.4.7c0 .9-2.5 2-2.5 3.1h2.6',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  quote: 'M7 7h4v5H7l-1 4M14 7h4v5h-4l-1 4',
  line: 'M4 12h16',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  done: 'm5 12.5 4.5 4.5L19 7.5',
  link: 'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1',
}

function Svg({ d, size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Botón de la barra: no le quita el foco al texto (si no, el teclado se cierra).
function Btn({ label, on, onTap, children, wide }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={'tb-btn' + (on ? ' on' : '') + (wide ? ' wide' : '')}
      onPointerDown={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onTap}
    >
      {children}
    </button>
  )
}

// Editor de la nota. El contenido no se convierte en cada letra: quien lo usa lee
// `editorRef.current` cuando guarda. La barra va en `toolbarSlot` (abajo de la nota,
// pegada al teclado) y solo se muestra mientras escribes.
export default function RichNote({ html, onChange, editorRef, nodes = [], onOpenNode, toolbarSlot, onEditing }) {
  const [focused, setFocused] = useState(false)
  const [picker, setPicker] = useState(null) // posición donde va el enlace
  const openPicker = useRef(null)
  const cb = useRef({})
  cb.current = { onChange, onOpenNode, onEditing }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: 'Escribe tu nota…' }),
      NodeLink,
      BibleRefs,
    ],
    content: html,
    // Solo la barra se vuelve a dibujar (con useEditorState), no todo el editor en cada letra.
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: 'rich', autocapitalize: 'sentences' },
      // Deja aire alrededor del cursor para que nunca quede pegado al borde o detrás de la barra.
      scrollMargin: { top: 24, bottom: 56, left: 0, right: 0 },
      scrollThreshold: { top: 24, bottom: 56, left: 0, right: 0 },
      // Escribir "[[" abre la lista de nodos para enlazar uno.
      handleTextInput(view, from, to, text) {
        if (text !== '[' || view.state.doc.textBetween(Math.max(0, from - 1), from) !== '[') return false
        view.dispatch(view.state.tr.delete(from - 1, to))
        openPicker.current?.(from - 1)
        return true
      },
      // Si no estás escribiendo, tocar una cita o un enlace lo abre (sin sacar el teclado).
      handleDOMEvents: {
        mousedown(view, e) {
          const t = e.target.closest?.('.ref-deco, a[data-node]')
          if (!t || view.hasFocus()) return false
          e.preventDefault()
          if (t.dataset.node) cb.current.onOpenNode?.(t.dataset.node)
          else openRef(t.dataset.ref)
          return true
        },
      },
    },
    onUpdate: () => cb.current.onChange?.(),
    onFocus: () => {
      setFocused(true)
      cb.current.onEditing?.(true)
    },
    onBlur: () => {
      setFocused(false)
      cb.current.onEditing?.(false)
    },
  })

  useEffect(() => {
    if (editorRef) editorRef.current = editor
  }, [editor, editorRef])
  openPicker.current = (pos) => setPicker(pos ?? editor?.state.selection.from ?? 0)

  function insertLink(title) {
    const at = picker
    setPicker(null)
    editor.chain().focus().insertContentAt(at, [{ type: 'nodeLink', attrs: { title } }, { type: 'text', text: ' ' }]).run()
  }

  return (
    <>
      <EditorContent editor={editor} />
      {editor && focused && toolbarSlot && createPortal(<Toolbar editor={editor} onLink={() => openPicker.current()} />, toolbarSlot)}
      {picker != null && (
        <NodePicker
          nodes={nodes}
          title="Enlazar nodo"
          onCancel={() => { setPicker(null); editor?.commands.focus() }}
          onPick={(id) => insertLink(nodes.find((n) => n.id === id)?.title ?? '')}
          onCreate={(title) => insertLink(title)}
        />
      )}
    </>
  )
}

// Barra de formato. Solo se redibuja cuando cambia algo que muestra (botones activos).
function Toolbar({ editor, onLink }) {
  const [panel, setPanel] = useState(false)
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      table: e.isActive('table'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      p: e.isActive('paragraph'),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      color: e.getAttributes('textStyle').color ?? null,
      mark: e.isActive('highlight') ? e.getAttributes('highlight').color ?? 'on' : null,
      task: e.isActive('taskList'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
    }),
  })

  // Al abrir o cerrar el panel cambia el espacio: el cursor se vuelve a poner a la vista.
  useEffect(() => {
    const t = setTimeout(() => editor.commands.scrollIntoView(), 30)
    return () => clearTimeout(t)
  }, [panel, s.table, editor])

  const run = (fn) => () => fn(editor.chain().focus()).run()

  if (s.table) {
    return (
      <div className="toolbar">
        <div className="tb-bar">
          <Btn label="Agregar fila" wide onTap={run((c) => c.addRowAfter())}>+ Fila</Btn>
          <Btn label="Agregar columna" wide onTap={run((c) => c.addColumnAfter())}>+ Columna</Btn>
          <Btn label="Quitar fila" wide onTap={run((c) => c.deleteRow())}>− Fila</Btn>
          <Btn label="Quitar columna" wide onTap={run((c) => c.deleteColumn())}>− Col.</Btn>
          <Btn label="Borrar tabla" wide onTap={run((c) => c.deleteTable())}><span className="danger-text">Borrar</span></Btn>
        </div>
      </div>
    )
  }

  return (
    <div className="toolbar">
      {panel && (
        <div className="tb-panel">
          <div className="tb-row styles">
            <Btn label="Título" wide on={s.h1} onTap={run((c) => c.toggleHeading({ level: 1 }))}><b className="s-h1">Título</b></Btn>
            <Btn label="Subtítulo" wide on={s.h2} onTap={run((c) => c.toggleHeading({ level: 2 }))}><b className="s-h2">Subtítulo</b></Btn>
            <Btn label="Encabezado" wide on={s.h3} onTap={run((c) => c.toggleHeading({ level: 3 }))}><b className="s-h3">Encabezado</b></Btn>
            <Btn label="Texto normal" wide on={s.p} onTap={run((c) => c.setParagraph())}>Cuerpo</Btn>
          </div>
          <div className="tb-row marks">
            <Btn label="Negrita" on={s.bold} onTap={run((c) => c.toggleBold())}><b>B</b></Btn>
            <Btn label="Cursiva" on={s.italic} onTap={run((c) => c.toggleItalic())}><i className="serif">I</i></Btn>
            <Btn label="Subrayado" on={s.underline} onTap={run((c) => c.toggleUnderline())}><u>U</u></Btn>
            <Btn label="Tachado" on={s.strike} onTap={run((c) => c.toggleStrike())}><s>S</s></Btn>
            <i className="tb-sep" />
            <Btn label="Sin color" on={!s.color} onTap={run((c) => c.unsetColor())}><i className="dot none" /></Btn>
            {TEXT_COLORS.map(([c, name]) => (
              <Btn key={c} label={name} on={s.color === c} onTap={run((ch) => ch.setColor(c))}><i className="dot" style={{ background: c }} /></Btn>
            ))}
            <i className="tb-sep" />
            <Btn label="Sin resaltar" on={!s.mark} onTap={run((c) => c.unsetHighlight())}><i className="dot square none" /></Btn>
            {MARK_COLORS.map(([c, name]) => (
              <Btn key={c} label={'Resaltar ' + name} on={s.mark === c} onTap={run((ch) => ch.setHighlight({ color: c }))}><i className="dot square" style={{ background: c }} /></Btn>
            ))}
          </div>
        </div>
      )}
      <div className="tb-bar">
        <Btn label="Formato" on={panel} onTap={() => setPanel((p) => !p)}><Svg d={P.aa} size={22} /></Btn>
        <Btn label="Lista de tareas" on={s.task} onTap={run((c) => c.toggleTaskList())}><Svg d={P.check} /></Btn>
        <Btn label="Lista" on={s.bullet} onTap={run((c) => c.toggleBulletList())}><Svg d={P.bullet} /></Btn>
        <Btn label="Lista numerada" on={s.ordered} onTap={run((c) => c.toggleOrderedList())}><Svg d={P.ordered} /></Btn>
        <Btn label="Enlazar nodo" onTap={onLink}><Svg d={P.link} /></Btn>
        <Btn label="Tabla" onTap={run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}><Svg d={P.table} /></Btn>
        <Btn label="Cita" on={s.quote} onTap={run((c) => c.toggleBlockquote())}><Svg d={P.quote} /></Btn>
        <Btn label="Línea" onTap={run((c) => c.setHorizontalRule())}><Svg d={P.line} /></Btn>
        <Btn label="Deshacer" onTap={run((c) => c.undo())}><Svg d={P.undo} /></Btn>
        <Btn label="Listo" onTap={() => editor.commands.blur()}><Svg d={P.done} /></Btn>
      </div>
    </div>
  )
}
