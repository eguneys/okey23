import { TextureFilter, TextureSampler } from 'blah'
import { Color } from 'blah'
import { Rect, Vec2, Mat3x2 } from 'blah'

import { Time, App, batch, Batch, Target } from 'blah'

import { bg1, link_color, Play, PlayType} from './play'
import Content from './content'

import { Anim } from './anim'
import Input, { EventPosition, DragEvent } from './input'


export type ClickableData = {
  abs?: true,
  debug?: true,
  rect: Rect,
  on_hover?: () => boolean,
  on_hover_end?: () => void,
  on_click_begin?: () => boolean,
  on_click?: () => boolean,
  on_drag_begin?: (e: Vec2) => boolean,
  on_drag_end?: (e: Vec2, m: Vec2) => void,
  on_drag?: (e: Vec2) => boolean,
  on_drop?: (e: Vec2, m: Vec2) => void,
  on_up?: (e: Vec2, right: boolean) => void,
  on_wheel?: (d: number) => void
}


export class Clickable extends Play {

  get data() {
    return this._data as ClickableData
  }

  get width() {
    return this._scaled_rect.w
  }

  get height() {
    return this._scaled_rect.h
  }

  _scaled_rect!: Rect

  get _rect() {
    return this.data.abs ? 
      Rect.make(this.position.x, this.position.y, this.width, this.height)
      : this._scaled_rect
  }

  get rect() {
    let { p_scissor } = this
    if (p_scissor) {
      return this._rect.overlaps_rect(p_scissor)
    } else {
      return this._rect
    }
  }

  _init() {

    this._scaled_rect = this.data.rect
    let _dragging = false
    let _hovering = false
    let self = this
    this.unbindable_input({
      on_click_begin(_e: EventPosition, right: boolean) {
        if (right) {
          return false
        }
        if (!self.p_visible) {
          return false
        }
        let e = _e.mul(Game.v_screen)
        let point = Rect.make(e.x - 4, e.y - 4, 8, 8)
        let rect = self.rect
        if (rect.overlaps(point)) {
          return self.data.on_click_begin?.() ?? false
        }
        return false
      },
      on_drag(d: DragEvent, d0?: DragEvent) {
        if (d._right) {
          return false
        }
        if (!self.p_visible) {
          return false
        }
        if (_dragging) {
          let m = d.m!.mul(Game.v_screen)
          return self.data.on_drag?.(m) ?? false
        }

        if (d.m && (!d0 || !d0.m)) {
          let e = d.e.mul(Game.v_screen)
          let point = Rect.make(e.x - 4, e.y - 4, 8, 8)
          let rect = self.rect
          if (rect.overlaps(point)) {
            _dragging = true
            return self.data.on_drag_begin?.(e) ?? false
          } else {
            return false
          }
        }
        return false
      },
      on_up_clear(e: Vec2, m?: Vec2) {
        let _e = e.mul(Game.v_screen)

        if (_dragging) {
          _dragging = false
          self.data.on_drag_end?.(_e, m!)
        } 
      },
      on_up(e: Vec2, right: boolean, m?: Vec2) {
        if (right) {
          return false
        }
        if (!self.p_visible) {
          return false
        }
        let _e = e.mul(Game.v_screen)

        if (_dragging) {
          _dragging = false
          self.data.on_drag_end?.(_e, m!)
        } 

        self.data.on_up?.(e, right)

        if (m) {

          let _m = m.mul(Game.v_screen)
          let point = Rect.make(_m.x - 4, _m.y - 4, 8, 8)
          let rect = self.rect
          if (rect.overlaps(point)) {
            return self.data.on_drop?.(e, m) ?? false
          }
        }


        return false
      },
      on_hover(_e: EventPosition) {
        if (!self.data.on_hover) {
          return false
        }
        if (!self.p_visible) {
          return false
        }
        let e = _e.mul(Game.v_screen)
        let point = Rect.make(e.x - 4, e.y - 4, 8, 8)
        let rect = self.rect
        if (rect.overlaps(point)) {
          if (!_hovering) {
            _hovering = true
            return self.data.on_hover?.() ?? false
          }
        } else {
          if (_hovering) {
            _hovering = false
            self.data.on_hover_end?.()
          }
        }
        return _hovering
      },
      on_hover_clear() {
        if (!self.data.on_hover_end) {
          return false
        }
        if (_hovering) {
          _hovering = false
          return self.data.on_hover_end?.()
        }
        if (!self.p_visible) {
          return false
        }
        return false
      },
      on_click(_e: EventPosition, right: boolean) {
        if (!self.p_visible) {
          return false
        }
        let e = _e.mul(Game.v_screen)
        let point = Rect.make(e.x - 4, e.y - 4, 8, 8)
        let rect = self.rect
        if (rect.overlaps(point)) {
          return self.data.on_click?.() ?? false
        }
        return false
      },
      on_wheel(d: number, _e: EventPosition) {
        if (!self.p_visible) {
          return false
        }
        let e = _e.mul(Game.v_screen)
        let point = Rect.make(e.x - 4, e.y - 4, 8, 8)
        let rect = self.rect
        if (rect.overlaps(point)) {
          return self.data.on_wheel?.(d) ?? false
        }
        return false
      }
    })
  }

  _draw() {
    batch.push_matrix(Mat3x2.create_translation(this.position))
    this.g_position = Vec2.transform(Vec2.zero, batch.m_matrix)
    this._scaled_rect = Rect.transform(this.data.rect, batch.m_matrix)
    if (this.data.debug) {
      batch.rect(Rect.make(0, 0, this.width, this.height), Color.hex(0x00ff00))
    }
    batch.pop_matrix()
  }

}


export type RectData = {
  w: number,
  h: number,
  color?: Color
}

export class RectView extends Play {

  get data() {
    return this._data as RectData
  }

  _color!: Color
  set color(c: Color) {
    this._color = c
  }
  get color() {
    return this._color
  }

  set height(h: number) {
    this.data.h = h
  }

  _init() {
    this.color = this.data.color ?? Color.white
  }

  _draw(batch: Batch) {
    batch.rect(Rect.make(this.position.x, this.position.y, this.data.w, this.data.h), this.color)
  }
}



type GameData = {
  on_content_load: () => void
}

export class Game extends Play {

  get data() {
    return this._data as GameData
  }

  static width = 1920
  static height = 1080

  static v_screen = Vec2.make(Game.width, Game.height)

  _init() {

    this.position = Vec2.zero

    batch.default_sampler = TextureSampler.make(TextureFilter.Linear)

    this.objects = []

    /*
    Sound.load().then(() => {
      console.log(Sound)
    })
   */

    Content.load().then(() => {
      //Trans.language = GeneralStore.language
      //this.make(SceneTransition, Vec2.zero, {})
      this.data.on_content_load()
    })
  }

  _update() {}

  _draw() {

    Play.next_render_order = 0
    App.backbuffer.clear(Color.black)

    this._draw_children(batch)
    Input._sort_hooks()
  }

}
