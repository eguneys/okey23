import { DuzOkey4Pov, sides, Side, Event as OkeyEvent, taslar, DuzOkey4, Tas as OTas } from 'lokey'

type Send = (_: string) => void


abstract class DuzOkey4PovWatcher implements OkeyHooks {

  send!: Send

  set_send(_send: Send) {
    this.send = _send
  }

  abstract on_events(pov: DuzOkey4Pov, events: OkeyEvent[]): void
}



class DuzOkey4SpecOrganizer extends DuzOkey4PovWatcher {

  static make = () => new DuzOkey4SpecOrganizer()

  on_events(pov: DuzOkey4Pov, events: OkeyEvent[]) {
  }
}

class DuzOkey4AiPlayer extends DuzOkey4PovWatcher {

  static make = () => new DuzOkey4AiPlayer()

  on_events(pov: DuzOkey4Pov, events: OkeyEvent[]) {
  }
}


class SinglePlayerDuzOkey4 {


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
  set_send: (send: (action: string) => void) => void;
  on_events: (pov0: DuzOkey4Pov, events: OkeyEvent[]) => void;
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
    }

  pov(s: Side) {
    return this.okey.pov(s)
  }

  get dests() {
    return this.okey.dests
  }

  act(action: string) {
    let povs = sides.map(side => this.okey.pov(side))
    let events = this.okey.act(action)



    sides.forEach((side, i) => 
                  this.hooks[side].on_events(povs[i], events.pov(side)))
    this.spec.on_events(povs[0], events.spec)
  }

}


