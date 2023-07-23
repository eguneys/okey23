import { ticks } from './shared'
import { Color } from 'blah'
import { Rect, Vec2, Mat3x2 } from 'blah'

import { Time, App, batch, Batch, Target } from 'blah'

import { bg1, link_color, Play, PlayType} from './play'
import Content from './content'

import { Anim } from './anim'
import Input, { EventPosition, DragEvent } from './input'

import { Game, RectView, Clickable } from './game'

import { Tween } from './tween'

import { sides, Side, Dests, Event as OkeyEvent, taslar, DuzOkey4, DuzOkey4Pov, Tas as OTas } from 'lokey'

import { SinglePlayerDuzOkey4, DuzOkey4PovWatcher } from './okey_hooks'

import { DuzState, ChangeState, OutTas, DrawTas } from 'lokey'


class DuzOkey4PlayPlayer extends DuzOkey4PovWatcher {

  static make = (okey: Okey23Play) => new DuzOkey4PlayPlayer(okey)

  constructor(readonly okey: Okey23Play) {
    super()

    okey.set_player(this)
  }

  on_events(pov: DuzOkey4Pov, events: OkeyEvent[], dests: Dests) {
    this.okey.sync_check_pov(pov)
    events.forEach(e => this.okey.patch_event_pov(e))
    this.okey.set_dests(dests)
  }
}


let epsilon = 2

type DragHook = (e: Vec2) => void
type DropHook = () => void
type ClickHook = () => boolean


class Tas extends Play {

  rank?: Anim
  anim!: Anim

  _tas?: OTas

  get tas() {
    return this._tas
  }

  set tas(tas: OTas | undefined) {
    this._tas = tas
    this.rank?.dispose()

    if (!tas) {
      return
    }

    let [color, number] = tas

    if (color === 'f') {

      this.rank = this.make(Anim, Vec2.make(0, 0), {
        name: `tas_bg`
      })
      this.rank.origin = Vec2.copy(this.anim.origin)

      this.rank.play_now('fake')

    } else {
      this.rank = this.make(Anim, Vec2.make(0, -20), {
        name: `${color}_numbers`
      })
      this.rank.origin = Vec2.make(23, 23)

      this.rank.play_now(`l${number}`)
    }
  }

  _flipped!: boolean

  get flipped() {
    return this._flipped
  }

  set flipped(v: boolean) {
    this._flipped = v


    if (this._flipped) {
      this.anim.play_now('back')
      if (this.rank) {
        this.rank.visible = false
      }
    } else {
      this.anim.play_now('idle')
      if (this.rank) {
        this.rank.visible = true
      }
    }

  }


  _will_hover!: boolean
  _will_hover_end!: boolean

  set alpha(v: number) {
    this.anim.alpha = v
    if (this.rank) {
      this.rank.alpha = v
    }
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

  _on_click?: ClickHook
  bind_click(e?: ClickHook) {
    this._on_click = e
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

  ease_rotation(r: number, duration: number = ticks.half) {
    this._tr = this.tween_single(this._tr, [this.rotation, r], (v) => {
      this.rotation = v
    }, duration, 0, () => { 
      this._tr = undefined
    })
  }

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

    this._flipped = false

    this.anim = this.make(Anim, Vec2.zero, {
      name: 'tas_bg'
    })
    this.anim.origin = Vec2.make(36, 51)

    let self = this
    this.make(Clickable, Vec2.make(0, 0).sub(this.anim.origin), {
      rect: Rect.make(0, 0, 72, 102),
      on_click() {
        if (self._on_click) {
          return self._on_click()
        }
        return false
      },
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
    this.lerp_position()
    this.unset_dragging()

    this.bind_drag(undefined)
    this.bind_drop(undefined)
    this.bind_hover(undefined)
    this.bind_click(undefined)
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
    this.frees = [...Array(106).keys()].map(tas => {
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

  place(x: number = this.s_width / 2) {
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


  sync_release_taslar() {
    let res = this.taslar

    this.taslar = []
    this.p1 = 
      new TasStackPositioner(72, 72 * 16)

    this.hide_ghost()
    return res
  }

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
    tas.bind_click()
    this._ghost.visible = true
    this._ghost.position = Vec2.copy(tas.position)
  }

  count_on_drag(v: Vec2) {
  }

  add_tas(tas: Tas, i?: Vec2) {
    let _ = this.p1.place(i?.x)
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

    tas.bind_click(() => {
      tas.flipped = !tas.flipped
      return true
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

  middle?: true
  side?: true
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

  sync_release_taslar() {
    return [this._tas]
  }

  drag(v: Vec2) {
    let _ = this._tas
    let _v = v.sub(_.drag_decay)
    _.lerp_position(_v, 1)
  }

  cancel_dispose() {
    this.tas.drag_release()
    this.stack.revive_ghost(this.tas)

    this.dispose()
  }


  out_dispose() {
    this.dispose()
  }
}


type DropTasPlaceData = {
  on_drag_hover: () => void
  on_drag_hover_end: () => void
  on_drop: () => boolean
}

class DropTasPlace extends Play {

  get data() {
    return this._data as DropTasPlaceData
  }

  _init() {

    let self = this
    this.make(Clickable, Vec2.make(0, 0), {
      rect: Rect.make(0, 0, 140, 160),
      on_drag_hover(e: EventPosition) {
        self.data.on_drag_hover()
      },
      on_drag_hover_end() {
        self.data.on_drag_hover_end()
      },
      on_drop(e: Vec2, m: Vec2) {
        return self.data.on_drop()
      }
    })

  }
}

class TurnFrame extends Play {

  _init() {

    let anim = this.make(Anim, Vec2.zero, {
      name: 'turn_frame'
    })

    anim.origin = Vec2.make(358, 187).scale(0.5)
  }
}

class TurnFrames extends Play {

  tf_1!: TurnFrame
  tf_2!: TurnFrame
  tf_3!: TurnFrame
  tf_4!: TurnFrame

  _init() {

    this.tf_1 = this.make(TurnFrame, Vec2.make(940, 690), {})
    this.tf_2 = this.make(TurnFrame, Vec2.make(1710, 390), {})
    this.tf_2.rotation = -Math.PI / 2

    this.tf_3 = this.make(TurnFrame, Vec2.make(900, 140), {})
    this.tf_3.rotation = - Math.PI
    this.tf_4 = this.make(TurnFrame, Vec2.make(200, 420), {})
    this.tf_4.rotation = - Math.PI * 1.5
  }


  set_state(side: Side, state: DuzState) {
    if (state !== ' ') {
      this.set_turn(side)
    }
  }

  set_turn(side: Side) {

    this.tf_1.visible = false
    this.tf_2.visible = false
    this.tf_3.visible = false
    this.tf_4.visible = false


    if (side === 1) {
      this.tf_1.visible = true
    } else if (side === 2) {
      this.tf_2.visible = true
    } else if (side === 3) {
      this.tf_3.visible = true
    } else if (side === 4) {
      this.tf_4.visible = true
    }
  }
}

class TurnArrow extends Play {
  _init() {
    let anim = this.make(Anim, Vec2.zero, {
      name: 'turn_arrow'
    })

    anim.origin = Vec2.make(112, 112).scale(0.5)
  }
}

class TurnArrows extends Play {

  draw_arrow!: TurnArrow
  draw_side_arrow!: TurnArrow
  out_arrow!: TurnArrow

  _init() {

    this.draw_side_arrow = this.make(TurnArrow, Vec2.make(560, 700), {})
    this.draw_side_arrow.rotation = -Math.PI * 1.2
    this.draw_arrow = this.make(TurnArrow, Vec2.make(1100, 600), {})
    this.draw_arrow.rotation = -Math.PI * 0.95
    this.out_arrow = this.make(TurnArrow, Vec2.make(1400, 700), {})
    this.out_arrow.rotation = Math.PI * 0.2

  }

  set_dests(dests?: Dests) {
    this.draw_arrow.visible = false
    this.draw_side_arrow.visible = false
    this.out_arrow.visible = false

    if (dests?.draw) {
      this.draw_arrow.visible = true
      this.draw_side_arrow.visible = true
    }
    if (dests?.out) {
      this.out_arrow.visible = true
    }
  }
}

class OutWaste extends Play {

  taslar!: Tas[]

  sync_release_taslar() {
    let res = this.taslar

    this.taslar = []

    return res
  }

  _init() {
    this.taslar = []
  }

  add_tas(tas: Tas) {
    tas.send_front()
    this.taslar.push(tas)
  }
}

type OutWastesData = {
  on_drag_side: (tas: Tas, v: Vec2) => boolean
}

class OutWastes extends Play {

  get data() {
    return this._data as OutWastesData
  }

  wastes!: OutWaste[]

  _init() {
    this.wastes = [
      this.make(OutWaste, Vec2.zero, {}),
      this.make(OutWaste, Vec2.zero, {}),
      this.make(OutWaste, Vec2.zero, {}),
      this.make(OutWaste, Vec2.zero, {})
    ]
  }

  sync_release_taslar() {
    return sides.flatMap(side => 
    this.wastes[side - 1].sync_release_taslar())
  }

  add_tas(side: Side, tas: Tas, cancel?: true) {
    this.wastes[side - 1].add_tas(tas)
    tas.bind_drag()
    if (side === 1) {
      tas.ease_rotation(-Math.PI * 0.2)
      tas.ease_position(Vec2.make(1480, 620))
    } else if (side === 2) {
      tas.position = Vec2.make(1652, 410)
      tas.ease_rotation(-Math.PI * 0.7)
      tas.ease_position(Vec2.make(1422, 300))
    } else if (side === 3) {
      tas.position = Vec2.make(890, 160)
      tas.ease_rotation(-Math.PI * 1.2)
      tas.ease_position(Vec2.make(500, 300))
    } else if (side === 4) {
      if (!cancel) {
        tas.position = Vec2.make(230, 410)
      }
      tas.ease_rotation(Math.PI * 0.1)
      tas.ease_position(Vec2.make(426, 625))

      let previous = this.wastes[3].taslar[this.wastes[3].taslar.length - 2]
      if (previous) {
        previous.bind_drag()
      }
      tas.bind_drag((e) => {
        if (this.data.on_drag_side(tas, e)) {
          this.wastes[3].taslar.pop()
        }
      })
    }
  }
}

type MiddleDrawData = {
  on_middle_drag: (tas: Tas, e: Vec2) => boolean
}

class MiddleDraw extends Play {

  get data() {
    return this._data as MiddleDrawData
  }

  tas?: Tas
  tas2?: Tas

  _init() {
  }

  sync_release_taslar() {

    let res = []

    if (this.tas) {
      res.push(this.tas)
    }

    if (this.tas2) {
      res.push(this.tas2)
    }

    this.tas = undefined
    this.tas2 = undefined
    return res
  }

  draw_tas(tas3?: Tas) {
    let tas = this.tas2

    if (tas) {
      this.tas = tas
      this.tas.position = Vec2.copy(this.p_position)
      this.tas.flipped = true

      let self = this
      this.tas.bind_drag((e: Vec2) => {
        if (self.data.on_middle_drag(self.tas!, e)) {

        }
      })
    }


    if (tas3) {
      this.tas2 = tas3
      this.tas2.position = Vec2.copy(this.p_position)
    }
  }

  set_tas(tas: Tas, tas2?: Tas) {
    if (tas2) {
      this.tas2 = tas2
      this.tas2.position = Vec2.copy(this.p_position)
      this.tas2.flipped = true
    }

    this.tas = tas
    this.tas.position = Vec2.copy(this.p_position)
    this.tas.flipped = true

    let self = this
    this.tas.bind_drag((e: Vec2) => {
      if (self.data.on_middle_drag(self.tas!, e)) {
      }
    })
  }
}


class Okey23Play extends Play {

  taslar!: Taslar
  stack!: TasStack
  stack2!: TasStack

  dragging?: DragTas
  side_dragging?: DragTas
  middle_dragging?: DragTas

  turn_frames!: TurnFrames
  turn_arrows!: TurnArrows

  out_wastes!: OutWastes

  middle_draw!: MiddleDraw

  _init() {
    this.make(Anim, Vec2.zero, {
      name: 'play_bg'
    })


    this.turn_frames = this.make(TurnFrames, Vec2.zero, {})
    this.turn_arrows = this.make(TurnArrows, Vec2.zero, {})


    let self = this
    this.make(Clickable, Vec2.make(0, 0), {
      rect: Rect.make(-10000, -10000, 100000, 100000),
      on_drop(e: Vec2, m: Vec2) {
        let i = m.mul(Game.v_screen).sub(self.g_position)

        if (self.middle_dragging) {
          self.middle_force_stack_add(i)

        }
        
        if (self.side_dragging) {

          self.side_dragging.tas.drag_release()
          self.out_wastes.add_tas(4, self.side_dragging.tas, true)

          self.side_dragging.dispose()
          self.side_dragging = undefined

        }


        if (self.dragging) {
          self.dragging.cancel_dispose()
          self.dragging = undefined
          return true
        }
      }
    })

    this.out_wastes = this.make(OutWastes, Vec2.zero, {
      on_drag_side(tas: Tas, v: Vec2) {
        if (self.side_dragging) {
          self.side_dragging.drag(v)
        } else {
          if (self.can_dests_draw_side) {
            self.side_dragging = self.make(DragTas, Vec2.zero, {})
            self.side_dragging.side = true
            self.side_dragging.tas = tas
            tas.ease_rotation(0)
            return true
          }
        }
        return false
      }
    })

    this.middle_draw = this.make(MiddleDraw, Vec2.make(1085, 480), {
      on_middle_drag(tas: Tas, v: Vec2) {
        if (self.middle_dragging) {
          self.middle_dragging.drag(v)
        } else {
          if (self.can_dests_draw_middle) {
            self.middle_dragging = self.make(DragTas, Vec2.zero, {})
            self.middle_dragging.middle = true
            self.middle_dragging.tas = tas
            tas.ease_rotation(0)

            self.send('draw')

            return true
          }
        }

        return false
      }
    })

    this.taslar = this.make(Taslar, Vec2.zero, {})


    const on_front_drop = (stack: TasStack, i: Vec2) => {
      if (this.middle_dragging) {
        this.middle_force_stack_add(i)
      }
      if (this.side_dragging) {

        this.side_dragging.tas.drag_release()

        let res = stack.add_tas(this.side_dragging.tas, i.sub(this.side_dragging.tas.drag_decay))
        if (!res) {
          this.out_wastes.add_tas(4, this.side_dragging.tas, true)
        } else {
        
          this.send('draw s')
        }


        this.side_dragging.dispose()
        this.side_dragging = undefined

      }
      if (this.dragging) {

        this.dragging.stack?.hide_ghost()


        this.dragging.tas.drag_release()
        let res = stack.add_tas(this.dragging.tas, i.sub(this.dragging.tas.drag_decay))

        if (!res) {
          this.dragging.stack.revive_ghost(this.dragging.tas)
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



    this.make(DropTasPlace, Vec2.make(1420, 550), {
      on_drag_hover() {
        if (self.dragging) {
          self.dragging.tas.ease_rotation(-Math.PI * 0.2)
        }
      },
      on_drag_hover_end() {
        if (self.dragging) {
          self.dragging.tas.ease_rotation(0)
        }
      },
      on_drop() {
        if (self.dragging) {

          if (self.can_dests_out) {
            self.dragging.stack?.hide_ghost()
            self.send(`out ${self.dragging.tas.tas}`)

            self.dragging.tas.drag_release()
            //self.taslar.release(self.dragging.tas)
            self.out_wastes.add_tas(1, self.dragging.tas)
            self.dragging.out_dispose()
            self.dragging = undefined

            return true
          } else {
            return false
          }
        }
      }
    })
  }

  private get can_dests_draw_middle() {
    return this._pov.action_side === 1 && this.dests.draw
  }

  private get can_dests_draw_side() {
    return this.can_dests_draw_middle
  }

  private get can_dests_out() {
    return this._pov.action_side === 1 && this.dests.out
  }

  private sync_release_taslar() {

    let taslar = [
      this.stack.sync_release_taslar(),
      this.stack2.sync_release_taslar(),
      this.out_wastes.sync_release_taslar(),
      this.middle_draw.sync_release_taslar(),
    ].flat()

    if (this.dragging) {
      taslar.push(
        ...
        this.dragging.sync_release_taslar())
        this.dragging = undefined
    }
    if (this.side_dragging) {
      taslar.push(...this.side_dragging.sync_release_taslar())
      this.side_dragging = undefined
    }
    if (this.middle_dragging) {
      taslar.push(
        ...this.middle_dragging.sync_release_taslar())

        this.middle_dragging = undefined
    }

    taslar.forEach(_ => this.taslar.release(_))
  }

  private middle_force_stack_add(v: Vec2) {
    if (!this.middle_dragging) {
      return
    }

    let tas = this.middle_dragging.tas, 
      i = v.sub(tas.drag_decay)

    tas.drag_release()

    let res = this.stack.add_tas(tas, i) 
    if (!res) {
        this.stack2.add_tas(tas, i) ||
          this.stack2.add_tas(tas) ||
          this.stack.add_tas(tas)
    }

    if (this.nb_middle_taslar > 1) {
      this.middle_draw.draw_tas(this.taslar.borrow())
    } else {
      this.middle_draw.draw_tas()
    }


    this.middle_dragging.dispose()
    this.middle_dragging = undefined
  }

  private set_draw_tas(tas: OTas) {
    if (this.middle_dragging) {
      this.middle_dragging.tas.tas = tas
    }
  }

  dests!: Dests
  set_dests(dests: Dests) {
    let { action_side } = this._pov

    this.dests = dests
    this.turn_arrows.set_dests(action_side === 1 ? dests : undefined)
  }

  private sync_load_pov() {
    let { action_side, okey, stacks, end_tas } = this._pov

    let { state, board, waste } = stacks[0]

    let wastes = stacks.map(_ => _.waste)
    let states = stacks.map(_ => _.state)

    this.sync_release_taslar()

    this.load_taslar(board)

    this.middle_draw.set_tas(this.taslar.borrow(), this.taslar.borrow())
    this.turn_frames.set_turn(action_side)
  }

  private apply_event(e: OkeyEvent) {
    if (e instanceof ChangeState) {
      let { side, state } = e

      this.turn_frames.set_state(side, state)
    }
    if (e instanceof OutTas) {
      if (e.side === 1) {
        return
      }
      let tas = this.taslar.borrow()
      tas.tas = e.tas
      this.out_wastes.add_tas(
        e.side, 
        tas)
    }
    if (e instanceof DrawTas) {
      if (e.side === 1) {
        this.set_draw_tas(e.tas!)
      }
    }
  }


  private load_taslar(taslar: OTas[]) {
    this.stack.add_taslar(taslar.map(_ => {
      let res = this.taslar.borrow()
      res.tas = _
      return res
    }))
  }


  _pov!: DuzOkey4Pov

  get nb_middle_taslar() {
    return this._pov.nb_middle
  }

  sync_check_pov(pov: DuzOkey4Pov) {
    if (!this._pov || this._pov.fen !== pov.fen) {
      console.log('sync load pov', 
                  this._pov?.fen, 
                  pov.fen)
      this._pov = pov
      this.sync_load_pov()
    }
  }

  patch_event_pov(e: OkeyEvent) {
    this.apply_event(e)
    e.patch_pov(this._pov)
  }


  player!: DuzOkey4PlayPlayer
  set_player(player: DuzOkey4PlayPlayer) {
    this.player = player
  }

  send(action: string) {
    this.player.send(action)
  }

}


export class SceneTransition extends Play {

  current!: Play

  _init() {

    this.current = this.make(Okey23Play, Vec2.zero, {})

    SinglePlayerDuzOkey4.make(
      DuzOkey4PlayPlayer.make(this.current as Okey23Play))

  }

  _draw(batch: Batch) {

    this.current.draw(batch)
    batch.render(App.backbuffer)
    batch.clear()
  }


}
