import * as ecs from '@8thwall/ecs'

// This component is attached to the logo, which allows instances to be queried for by the reset 
// button
const Logo: any = (ecs && typeof ecs.registerComponent === 'function') ? ecs.registerComponent({name: 'logo'}) : 'logo'

export {
  Logo, 
}
