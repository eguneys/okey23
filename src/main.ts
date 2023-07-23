import { App, batch } from 'blah'
import { Vec2 } from 'blah'
import { Game } from './game'
import Input from './input'
import { Scene1 } from './scene1'

function app(element: HTMLElement) {

  let game = new Game()

  App.run({
    name: 'stacksize-js2023',
    width: 1920,
    height: 1080,
    on_startup() {
      game._set_data(Vec2.zero, {
        on_content_loaded() {
          game.make(Scene1)
        }
      }).init()
    },
    on_update() {
      Input.update()
      game.update()
    },
    on_render() {
      game.draw(batch)
    }
  })


  if (App.canvas) {
    element.appendChild(App.canvas)
  }

  Input.listen(element)
}


app(document.getElementById('app')!)
