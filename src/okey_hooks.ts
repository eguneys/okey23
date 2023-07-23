import { ChangeState } from 'lokey'

import { Dests, Events, DuzOkey4Pov, sides, Side, Event as OkeyEvent, taslar, DuzOkey4, Tas as OTas } from 'lokey'


class DuzAi {
  static make = new DuzAi()

  async out(pov: DuzOkey4Pov) {
    let tas = pov.stacks[0].board[0]
    return `out ${tas}`
  }

  async draw(pov: DuzOkey4Pov) {
    return 'draw'
  }
}


type Send = (_?: string) => void


export abstract class DuzOkey4PovWatcher implements OkeyHooks {

  send!: Send

  set_send(_send: Send) {
    this.send = _send
  }

  abstract on_events(pov: DuzOkey4Pov, events: OkeyEvent[], dests: Dests): void
}



class DuzOkey4SpecOrganizer extends DuzOkey4PovWatcher {

  static make = () => new DuzOkey4SpecOrganizer()

  on_events(pov: DuzOkey4Pov, events: OkeyEvent[]) {
  }
}

class DuzOkey4AiPlayer extends DuzOkey4PovWatcher {

  static make = () => new DuzOkey4AiPlayer()

  ai: DuzAi = DuzAi.make

  send_sometime(s: string) {
    setTimeout(() => this.send(s), 400 + 800 * Math.random())
  }

  on_events(pov: DuzOkey4Pov, events: OkeyEvent[], dests: Dests) {
  
    let { ai } = this

    events.forEach(_ => _.patch_pov(pov))

    let my_state = pov.action_side === 1

    if (my_state) {
      if (dests.draw) {
        ai.draw(pov).then(_ => this.send_sometime(_))
      } else if (dests.out) { // out
        ai.out(pov).then(_ => this.send_sometime(_))
      }
    }
  }
}


export class SinglePlayerDuzOkey4 {

  static make = (hooks: DuzOkey4PovWatcher) => new SinglePlayerDuzOkey4(hooks)


  hooks: DuzOkey4Hooks

  constructor(p_hooks: DuzOkey4PovWatcher) {

    let hooks = {
      1: p_hooks,
      2: DuzOkey4AiPlayer.make(),
      3: DuzOkey4AiPlayer.make(),
      4: DuzOkey4AiPlayer.make()
    }

    let spec = DuzOkey4SpecOrganizer.make()

    this.hooks = DuzOkey4Hooks.make(DuzOkey4.deal(), hooks, spec)
  }

}


interface OkeyHooks {
  set_send: (send: Send) => void;
  on_events: (pov0: DuzOkey4Pov, events: OkeyEvent[], dests: Dests) => void;
}

class DuzOkey4Hooks {

  static make = (
    okey: DuzOkey4,
    hooks: Record<Side, OkeyHooks>,
    spec: OkeyHooks) => 
  new DuzOkey4Hooks(okey, hooks, spec)

  constructor(
    readonly okey: DuzOkey4,
    readonly hooks: Record<Side, OkeyHooks>,
    readonly spec: OkeyHooks) {
    
      sides.forEach(side => 
        hooks[side].set_send(_ => this.act(_)))

      spec.set_send(_ => this.act(_))

      this.act()
    }

  pov(s: Side) {
    return this.okey.pov(s)
  }

  get dests() {
    return this.okey.dests
  }

  act(action?: string) {
    let povs = sides.map(side => this.okey.pov(side))
    let events = action ? this.okey.act(action) : new Events()

    let { dests } = this.okey

    sides.forEach((side, i) => 
                  this.hooks[side].on_events(povs[i], events.pov(side), dests))
    this.spec.on_events(povs[0], events.spec, dests)
  }

}


