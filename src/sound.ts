

function load_audio(path: string): HTMLMediaElement {
  let res = new Audio(path)
  return res
}

let names: string[] = []


class Sound {

  audios!: Record<string, Array<HTMLMediaElement>>

  load = async () => {


    this.audios = {}
    names.forEach(name => this.audios[name] = [...Array(4).keys()].map(() =>
      load_audio(`./audio/${name}.wav`))
    )

  }

  play(name: string) {
    let audios = this.audios[name]

    let audio = audios.pop()!
    audios.unshift(audio)

    audio.play()
  }

}


export default new Sound()
