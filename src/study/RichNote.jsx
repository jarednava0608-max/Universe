// Editor de Notas con formato (como Notas del iPhone): títulos, negritas, colores,
// listas, tareas, tablas, citas y líneas. Todo local (TipTap), sin servicios.
import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { Highlight } from '@tiptap/extension-highlight'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'

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
}

function Svg({ d, size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Sube la barra de herramientas junto con el teclado del iPhone.
function useKeyboardOffset() {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return offset
}

export default function RichNote({ html, onChange, editorRef }) {
  const [focused, setFocused] = useState(false)
  const [panel, setPanel] = useState(false)
  const offset = useKeyboardOffset()

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
    ],
    content: html,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: 'rich', autocapitalize: 'sentences' } },
    onUpdate: ({ editor }) => onChange({ html: editor.getHTML(), texto: editor.getText({ blockSeparator: '\n' }) }),
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false)
      setPanel(false)
    },
  })

  useEffect(() => {
    if (editorRef) editorRef.current = editor
  }, [editor, editorRef])

  const run = (fn) => (e) => {
    e.preventDefault()
    fn(editor.chain().focus()).run()
  }
  // Botón que no le quita el foco al texto (si no, el teclado se cierra).
  const Btn = ({ label, on, onTap, children, wide }) => (
    <button type="button" aria-label={label} className={'tb-btn' + (on ? ' on' : '') + (wide ? ' wide' : '')} onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()} onClick={onTap}>
      {children}
    </button>
  )
  const inTable = editor?.isActive('table')

  return (
    <>
      <EditorContent editor={editor} />

      {editor && focused && (
        <div className="toolbar" style={{ bottom: offset }}>
          {panel && !inTable && (
            <div className="tb-panel">
              <div className="tb-row styles">
                <Btn label="Título" wide on={editor.isActive('heading', { level: 1 })} onTap={run((c) => c.toggleHeading({ level: 1 }))}><b className="s-h1">Título</b></Btn>
                <Btn label="Subtítulo" wide on={editor.isActive('heading', { level: 2 })} onTap={run((c) => c.toggleHeading({ level: 2 }))}><b className="s-h2">Subtítulo</b></Btn>
                <Btn label="Encabezado" wide on={editor.isActive('heading', { level: 3 })} onTap={run((c) => c.toggleHeading({ level: 3 }))}><b className="s-h3">Encabezado</b></Btn>
                <Btn label="Texto normal" wide on={editor.isActive('paragraph')} onTap={run((c) => c.setParagraph())}>Cuerpo</Btn>
              </div>
              <div className="tb-row">
                <Btn label="Negrita" on={editor.isActive('bold')} onTap={run((c) => c.toggleBold())}><b>B</b></Btn>
                <Btn label="Cursiva" on={editor.isActive('italic')} onTap={run((c) => c.toggleItalic())}><i className="serif">I</i></Btn>
                <Btn label="Subrayado" on={editor.isActive('underline')} onTap={run((c) => c.toggleUnderline())}><u>U</u></Btn>
                <Btn label="Tachado" on={editor.isActive('strike')} onTap={run((c) => c.toggleStrike())}><s>S</s></Btn>
              </div>
              <div className="tb-row colors">
                <span className="tb-label">Color</span>
                <Btn label="Sin color" on={!editor.getAttributes('textStyle').color} onTap={run((c) => c.unsetColor())}><i className="dot none" /></Btn>
                {TEXT_COLORS.map(([c, name]) => (
                  <Btn key={c} label={name} on={editor.isActive('textStyle', { color: c })} onTap={run((ch) => ch.setColor(c))}><i className="dot" style={{ background: c }} /></Btn>
                ))}
              </div>
              <div className="tb-row colors">
                <span className="tb-label">Resaltar</span>
                <Btn label="Sin resaltar" on={!editor.isActive('highlight')} onTap={run((c) => c.unsetHighlight())}><i className="dot none" /></Btn>
                {MARK_COLORS.map(([c, name]) => (
                  <Btn key={c} label={'Resaltar ' + name} on={editor.isActive('highlight', { color: c })} onTap={run((ch) => ch.setHighlight({ color: c }))}><i className="dot square" style={{ background: c }} /></Btn>
                ))}
              </div>
            </div>
          )}

          {inTable ? (
            <div className="tb-bar">
              <Btn label="Agregar fila" wide onTap={run((c) => c.addRowAfter())}>+ Fila</Btn>
              <Btn label="Agregar columna" wide onTap={run((c) => c.addColumnAfter())}>+ Columna</Btn>
              <Btn label="Quitar fila" wide onTap={run((c) => c.deleteRow())}>− Fila</Btn>
              <Btn label="Quitar columna" wide onTap={run((c) => c.deleteColumn())}>− Col.</Btn>
              <Btn label="Borrar tabla" wide onTap={run((c) => c.deleteTable())}><span className="danger-text">Borrar</span></Btn>
            </div>
          ) : (
            <div className="tb-bar">
              <Btn label="Formato" on={panel} onTap={() => setPanel((p) => !p)}><Svg d={P.aa} size={22} /></Btn>
              <Btn label="Lista de tareas" on={editor.isActive('taskList')} onTap={run((c) => c.toggleTaskList())}><Svg d={P.check} /></Btn>
              <Btn label="Lista" on={editor.isActive('bulletList')} onTap={run((c) => c.toggleBulletList())}><Svg d={P.bullet} /></Btn>
              <Btn label="Lista numerada" on={editor.isActive('orderedList')} onTap={run((c) => c.toggleOrderedList())}><Svg d={P.ordered} /></Btn>
              <Btn label="Tabla" onTap={run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}><Svg d={P.table} /></Btn>
              <Btn label="Cita" on={editor.isActive('blockquote')} onTap={run((c) => c.toggleBlockquote())}><Svg d={P.quote} /></Btn>
              <Btn label="Línea" onTap={run((c) => c.setHorizontalRule())}><Svg d={P.line} /></Btn>
              <Btn label="Deshacer" onTap={run((c) => c.undo())}><Svg d={P.undo} /></Btn>
              <Btn label="Listo" onTap={() => editor.commands.blur()}><Svg d={P.done} /></Btn>
            </div>
          )}
        </div>
      )}
    </>
  )
}
