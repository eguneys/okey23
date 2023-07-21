import { ticks } from './shared'
import { Color } from 'blah'
import { Rect, Vec2, Mat3x2 } from 'blah'

import { Time, App, batch, Batch, Target } from 'blah'

import { bg1, link_color, Play, PlayType} from './play'
import Content from './content'

import { Anim } from './anim'
import Input, { EventPosition, DragEvent } from './input'

import { Game, RectView, Clickable } from './game'

import { taslar, DuzOkey4, Tas as OTas } from 'lokey'
import { Tween } from './tween'

let epsilon = 2

type DragHook = (e: Vec2) => void
type DropHook = () => void


class Tas extends Play {

  anim!: Anim


  _will_hover!: boolean
  _will_hover_end!: boolean

  set alpha(v: number) {
    this.anim.alpha = v
  }

  get easing() {
    return !!this._tx || !!this._ty || !!this._tr
  }

  _will_lerp_t?: number
  _will_lerp_position?: Vec2
  lerp_position(v?: Vec2, t?: number) {

    if (this._tx) {
      this.cancel(this._tx)
      this._tx = undefined
    }
    if (this._ty) {
      this.cancel(this._ty)
      this._ty = undefined
    }

    this._will_lerp_position = v
    this._will_lerp_t = t
    if (v) {
      this._target_speed = (1-(t || 0.5)) * 0.2
    } else {
      this._target_speed = 0
    }

    if (this._will_lerp_position) {
      this.position = Vec2.lerp(this.position, this._will_lerp_position, this._will_lerp_t ?? 0.5)
    }
  }

  _dragging!: boolean

  get drag_decay() {
    return this._drag_decay
  }
  _drag_decay: Vec2 = Vec2.zero
  _on_drag?: DragHook
  bind_drag(e?: DragHook) {
    this._on_drag = e
  }

  _on_drop?: DropHook
  bind_drop(e?: DropHook) {
    this._on_drop = e
  }

  _on_hover?: [DropHook, DropHook]
  bind_hover(e?: [DropHook, DropHook]) {
    this._on_hover = e
  }




  _tr?: Tween
  _tx?: Tween
  _ty?: Tween

  _f_position?: Vec2

  get f_position() {
    return this._f_position ?? this.position
  }

  _target_speed!: number
  _speed!: number

  ease_position(v: Vec2, duration: number = ticks.half) {
    if (v.equals(this.position)) {
      return
    }
    this._f_position = v
    this._target_speed = (duration / ticks.half) * 0.2
    this._tx = this.tween_single(this._tx, [this.position.x, v.x], (v) => {
      this.position.x = v
    }, duration, 0, () => {
      this._f_position = undefined
      this._tx = undefined
      this._target_speed = 0
    })

    this._ty = this.tween_single(this._ty, [this.position.y, v.y], (v) => {
      this.position.y = v
    }, duration, 0, () => { this._ty = undefined })
  }

  set_dragging() {
    this._dragging = true
  }

  unset_dragging() {
    this._dragging = false
  }

  _init() {
    this.anim = this.make(Anim, Vec2.zero, {
      name: 'tas_bg'
    })
    this.anim.origin = Vec2.make(36, 51)


    let self = this
    this.make(Clickable, Vec2.make(0, 0).sub(this.anim.origin), {
      rect: Rect.make(0, 0, 72, 102),
      on_hover() {
        if (self._on_hover) {
          self._on_hover[0]()
        }
        if (self._on_drag) {
          self._will_hover = true
          return true
        }
        return false
      },
      on_hover_end() {
        if (self._on_hover) {
          self._on_hover[1]()
        }
        self._will_hover_end = true
      },
      on_drag_begin(e: Vec2) {
        if (self._on_drag) {
          //self._lerp_drag_shadow = 0
          self._dragging = true
          self._drag_decay = e.sub(self.position)
          return true
        }
        return false
      },
      on_drag_end() {
        self._dragging = false
      },
      on_drag(e: Vec2) {
        if (self._on_drag) {
          self._on_drag(e)
          return true
        }
        return false
      },
      on_drop() {
        if (self._on_drop) {
          self._on_drop()
        }
      }
    })

  }

  _update() {

    if (this._will_lerp_position) {
      this.position = Vec2.lerp(this.position, this._will_lerp_position, this._will_lerp_t ?? 0.5)
    }
  }

  drag_release() {
    this.lerp_position()
    this.unset_dragging()
  }

  release() {
  }
}


class Taslar extends Play {
  frees!: Array<Tas>
  used!: Array<Tas>

  borrow() {
    let tas = this.frees.shift()!
    this.used.push(tas)

    tas.visible = true
    return tas
  }


  release(tas: Tas) {
    tas.visible = false
    this.used.splice(this.used.indexOf(tas), 1)
    tas.release()
    this.frees.push(tas)
  }

  _init() {
    this.frees = taslar.slice(0, 20).map(tas => {
      let _ = this.make(Tas, Vec2.zero, {})
      _.visible = false
      return _
    })
    this.used = []
  }

}


class TasStackPositioner {

  constructor(
    readonly width: number,
    readonly s_width: number,
    readonly rects: number[] = []) {}

  resolve_overlap(current_x: number, new_x: number): [number, number][] | undefined {

    let { s_width, width } = this

    if (new_x < 0 || new_x > s_width) {
      return undefined
    }

    let i = this.rects.findIndex(_ => Math.abs(current_x - _) < epsilon)
    if (current_x !== new_x && i !== -1) {
      this.rects.splice(i, 1)
    }



    let res = []
    for (let rect of this.rects.slice(0)) {
      if (Math.abs(new_x - rect) < width) {
        if (new_x > rect) {
          let lo = this.resolve_overlap(rect, new_x - width)
          if (!lo) {

            if (current_x !== new_x) {
              this.rects.push(current_x)
            }
            return undefined
          }
          res.push(...lo)
        } else {
          let ro = this.resolve_overlap(rect, new_x + width)
          if (!ro) {
            if (current_x !== new_x) {
              this.rects.push(current_x)
            }

            return undefined
          }
            res.push(...ro)
        }
      }
    }
    this.rects.push(new_x)

    return [[current_x, new_x], ...res]
  }

  place(x: number = this.width / 2) {
    return this.resolve_overlap(x, x)
  }

  remove(current_x: number) {
    let i = this.rects.findIndex(_ => Math.abs(current_x - _) < epsilon)
    if (i !== -1) {
      this.rects.splice(i, 1)
    }
  }
}


type TasStackData = {
  on_front_drag: (stack: TasStack, _: Tas, e: EventPosition) => void
  on_front_drop: (stack: TasStack, i: Vec2) => void
}

class TasStack extends Play {

  get data() {
    return this._data as TasStackData
  }

  _ghost!: Tas

  taslar!: Tas[]

  p1!: TasStackPositioner

  _init() {


    this.taslar = []
    this.p1 = 
      new TasStackPositioner(72, 72 * 16)

    let self = this
    this.make(Clickable, Vec2.make(0, 0), {
      rect: Rect.make(0, 0, 72 * 16, 102),
      on_drop(e: Vec2, m: Vec2) {
        let i = m.mul(Game.v_screen).sub(self.g_position)
        self.data.on_front_drop(self, i)
        return true
      }
    })



  }

  set_ghost(tas: Tas) {
    this._ghost = tas
    this._ghost.alpha = 86
    this._ghost.visible = false
  }

  revive_ghost(tas: Tas) {
    this.add_tas(tas, this._ghost.position.sub(this.p_position))
    this._ghost.visible = false
  }

  hide_ghost() {

    this._ghost.visible = false
  }

  make_ghost(tas: Tas) {
    this.p1.remove(tas.position.sub(this.p_position).x)
    this.taslar.splice(this.taslar.indexOf(tas), 1)
    this._ghost.visible = true
    this._ghost.position = Vec2.copy(tas.position)
  }

  count_on_drag(v: Vec2) {
  }

  add_tas(tas: Tas, i: Vec2) {
    let _ = this.p1.place(i.x)
    if (!_) {
      return false
    }
    let [[a, x], ...rest] = _

    let pp = Vec2.make(x, this.p_position.y)
    pp.x += this.p_position.x
    pp.y += tas.anim.origin.y
    tas.ease_position(pp)

    tas.bind_drag((e: Vec2) => {
      this.data.on_front_drag(this, tas, e)
    })

    rest.forEach(([x, new_x]) => {
      let _ = this.taslar.find(_ => 
                               Math.abs(_.f_position.x - this.p_position .x - x) < epsilon)
      if (_) {
        _.ease_position(Vec2.make(_.f_position.x -x + new_x, _.f_position.y))
      }
    })

    this.taslar.push(tas)

    //console.log(i.x, x, this.p1.rects, rest, this.taslar.map(_ => _.f_position.x - this.p_position.x))
    return true
  }

  add_taslar(taslar: Tas[]) {
    taslar.forEach(_ => this.add_tas(_, Vec2.zero))
  }
}

class DragTas extends Play {

  _stack?: TasStack

  set stack(stack: TasStack) {
    this._stack = stack
  }

  get stack() {
    return this._stack!
  }

  _tas!: Tas

  get tas() {
    return this._tas
  }

  set tas(tas: Tas) {
    this._tas = tas
    this._tas.send_front()
    this._tas.set_dragging()
  }


  drag(v: Vec2) {
    let _ = this._tas
    let _v = v.sub(_.drag_decay)
    _.lerp_position(_v, 1)
  }
}


class Okey23Play extends Play {

  taslar!: Taslar
  stack!: TasStack
  stack2!: TasStack

  dragging?: DragTas

  _init() {
    this.make(Anim, Vec2.zero, {
      name: 'play_bg'
    })




    let self = this
    this.make(Clickable, Vec2.make(0, 0), {
      rect: Rect.make(-10000, -10000, 100000, 100000),
      on_drop(e: Vec2, m: Vec2) {
        let i = m.mul(Game.v_screen).sub(self.g_position)
        //.div(Vec2.make(72 * 16, 102))
        
        if (self.dragging) {

          self.dragging.tas.drag_release()
          self.dragging.stack.revive_ghost(self.dragging.tas)

          self.dragging.dispose()
          self.dragging = undefined
          return true
        }
      }
    })

    this.taslar = this.make(Taslar, Vec2.zero, {})

    const on_front_drop = (stack: TasStack, i: Vec2) => {
      if (this.dragging) {

        this.dragging.stack?.hide_ghost()


        this.dragging.tas.drag_release()
        let res = stack.add_tas(this.dragging.tas, i.sub(this.dragging.tas.drag_decay))

        if (!res) {
          self.dragging.stack.revive_ghost(self.dragging.tas)
        }

        this.dragging.dispose()
        this.dragging = undefined
      }
    }

    const on_front_drag = (stack: TasStack, _: Tas, v: Vec2) => {
      if (this.dragging) {
        stack.count_on_drag(v)
        this.dragging.drag(v)
      } else {
        stack.make_ghost(_)
        this.dragging = this.make(DragTas, Vec2.zero, {})
        this.dragging.stack = stack
        this.dragging.tas = _
      }
    }

    this.stack = this.make(TasStack, Vec2.make(400, 780), {
      on_front_drop,
      on_front_drag
      
    })
    this.stack2 = this.make(TasStack, Vec2.make(400, 910), {
      on_front_drop,
      on_front_drag
    })

    this.stack.set_ghost(this.taslar.borrow())
    this.stack2.set_ghost(this.taslar.borrow())

    this.stack.add_taslar([
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
      this.taslar.borrow(),
    ])


  }
}


export class SceneTransition extends Play {

  current!: Play

  _init() {

    this.current = this.make(Okey23Play, Vec2.zero, {})
  }

  _draw(batch: Batch) {

    this.current.draw(batch)
    batch.render(App.backbuffer)
    batch.clear()
  }


}
