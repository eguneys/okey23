import { Language } from './trans'

class GeneralStore {

  get language() {
    return 'en'
  }

  set language(_: Language) {
  }

}

let general = new GeneralStore()

export { general as GeneralStore }

