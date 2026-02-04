export class REXClientModule {
  instantiationTarget:string

  constructor() {
    if (new.target === REXClientModule) {
      throw new Error('Cannot be instantiated')
    }

    this.instantiationTarget = new.target.toString()
  }

  setup() {
    console.log(`[REXClientModule] TODO: Implement in ${this.instantiationTarget}...`)
  }

  toString():string {
    return 'REXClientModule (overrride in subclasses)'
  }
}

export function registerREXkModule(rexModule:REXClientModule) {
  rexModule.setup()
}
