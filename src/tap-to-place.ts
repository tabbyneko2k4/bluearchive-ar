import * as ecs from '@8thwall/ecs'

const OBJECT_PLACED_EVENT = 'object-placed'
const OBJECT_RESET_EVENT = 'object-reset'

if (ecs && typeof ecs.registerComponent === 'function') {
  ecs.registerComponent({
    name: 'tap-to-place',
    schema: {
      prefab: 'eid'
    },
    stateMachine: ({world, eid, schemaAttribute, defineState}) => {
      defineState('initial')
        .initial()
        .onEvent(OBJECT_PLACED_EVENT, 'placed', {target: eid})
        .listen(eid, ecs.input.SCREEN_TOUCH_START, (e) => {
          if (!e.data.worldPosition) {
            return
          }
          const newEid = world.createEntity(schemaAttribute.get(eid).prefab)
          const newEntity = world.getEntity(newEid)
          newEntity.setLocalPosition(e.data.worldPosition)
          newEntity.set(ecs.Quaternion, ecs.math.quat.yRadians(Math.random() * Math.PI))
          
          world.events.dispatch(eid, OBJECT_PLACED_EVENT)
          world.events.dispatch(world.events.globalId, OBJECT_PLACED_EVENT)
        })

      defineState('placed')
        .onEvent(OBJECT_RESET_EVENT, 'initial', {target: world.events.globalId})
    }
  })
}

export {
  OBJECT_PLACED_EVENT,
  OBJECT_RESET_EVENT,
}

