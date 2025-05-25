# SnowState.js

SnowState.js is a lightweight but powerful finite state machine library for TypeScript/JavaScript applications.

## Installation

```bash
npm install @sohomsahaun/snowstate
```

## Basic Usage

```typescript
import { createSnowState } from 'snowstate';

// Create a state machine with "idle" as the initial state
const fsm = createSnowState("idle")
  .add("idle", { // Add states with their behavior
    enter: () => {
      // Set sprite to idle animation
    },
    update: () => {
      if (rightKeyPressed || leftKeyPressed) {
        fsm.change("walk");
      }
    },
    draw: () => {
      // Draw character in idle pose
    }
  })
  .add("walk", {
    enter: () => {
      // Set sprite to walking animation
    },
    update: () => {
      if (!rightKeyPressed && !leftKeyPressed) {
        fsm.change("idle");
      }
    },
    draw: () => {
      // Draw character in walking pose
    }
  });
```

## API Reference

### Creating a State Machine

#### `createSnowState(initialState)`

Creates a new state machine with the specified initial state.

| Argument | Type | Description |
| --- | --- | --- |
| initialState | string | Initial state for the state machine |

**Returns:** SnowState instance

**Example:**
```typescript
const fsm = createSnowState("idle");
```

### Managing States

#### `.add(stateName, stateObject)`

Adds a new state to the state machine.

| Argument | Type | Description |
| --- | --- | --- |
| stateName | string | Name for the state |
| stateObject | object | State object containing event methods |

**Returns:** SnowState (with updated type information)

**Example:**
```typescript
fsm.add("idle", {
  enter: () => {
    // Set sprite to idle animation
  },
  update: () => {
    if (rightKeyPressed || leftKeyPressed) {
      fsm.change("walk");
    }
  }
});
```

#### `.change(stateName, leaveFunc?, enterFunc?, data?)`

Changes the state, performing the `leave` event for the current state and `enter` event for the next state by default.

| Argument | Type | Description |
| --- | --- | --- |
| stateName | string | State to switch to |
| leaveFunc? | function | Custom leave event for the current state |
| enterFunc? | function | Custom enter event for the next state |
| data? | any | Data that can be passed to the leave/enter functions |

**Returns:** SnowState instance

**Example:**
```typescript
fsm.change("attack");
```

With custom enter function:
```typescript
fsm.change("attack", undefined, () => {
  console.log("Overridden enter event for the attack state");
});
```

#### `.stateIs(stateName, stateToCheck?)`

Returns `true` if the current state matches the given state name.

| Argument | Type | Description |
| --- | --- | --- |
| stateName | string | State to check against |

**Returns:** boolean

**Example:**
```typescript
if (fsm.stateIs("idle")) {
  // Do something if in idle state
}
```

#### `.stateExists(stateName)`

Returns `true` if stateName is defined as a state.

| Argument | Type | Description |
| --- | --- | --- |
| stateName | string | State to check for |

**Returns:** boolean

**Example:**
```typescript
if (fsm.stateExists("somersault")) {
  fsm.change("somersault");
}
```

#### `.getStates()`

Returns an array of all states defined in the state machine.

**Returns:** string[]

**Example:**
```typescript
const allStates = fsm.getStates();
```

#### `.getCurrentState()`

Returns the current state the system is in.

**Returns:** string

**Example:**
```typescript
if (fsm.getCurrentState() === "opened") {
  fsm.change("closed");
}
```

#### `.getPreviousState()`

Returns the previous state the system was in.

**Returns:** string | null

**Example:**
```typescript
if (fsm.getPreviousState() === "idle") {
  fsm.change("run");
}
```

#### `.getTime()`

Returns the number of milliseconds the current state has been running for.

**Returns:** number

**Example:**
```typescript
const time = fsm.getTime();
```

#### `.setTime(milliseconds)`

Sets the number of milliseconds the current state has been running for.

| Argument | Type | Description |
| --- | --- | --- |
| milliseconds | number | Duration the current state has been running for |

**Returns:** SnowState instance

**Example:**
```typescript
fsm.setTime(0);
```
This resets the current state duration.


#### `.on(event, callback)`

Executes a callback when a certain event occurs. (Listed below)

| Argument | Type | Description |
| --- | --- | --- |
| event | string | Event that is being emitted |
| callback | function | Callback to execute when the event occurs |

**Returns:** SnowState instance

**Example:**
```typescript
fsm.on("state changed", (destState: string, sourceState: string) => {
  console.log("State has changed from " + sourceState + " to " + destState);
});
```

Built-in events:
<table>
<thead>
  <tr>
    <th rowspan="2">Event</th>
    <th colspan="3">Callback Arguments</th>
  </tr>
  <tr>
    <th>Argument</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td rowspan="3">state changed</td>
    <td>dest_state</td>
    <td>String</td>
    <td>State it has switched to</td>
  </tr>
  <tr>
    <td>source_state</td>
    <td>String</td>
    <td>State it has switched from</td>
  </tr>
  <tr>
    <td>transition_name</td>
    <td>String</td>
    <td>The transition which was triggered for the state change (<code>undefined</code> if not applicable)</td>
  </tr>
</tbody>
</table>

### Events

#### `.eventSetDefaultMethod(eventName, method)`

Sets the default function of an event for all states.

| Argument | Type | Description |
| --- | --- | --- |
| eventName | string | Event to set the default function for |
| method | function | Default function for the event |

**Returns:** SnowState (with updated type information)

**Example:**
```typescript
fsm.eventSetDefaultMethod("draw", () => {
  // Draw self logic
});
```

#### `.eventExists(eventName)`

Checks if an event exists for the current state.

| Argument | Type | Description |
| --- | --- | --- |
| eventName | string | Event to check |

**Returns:** SNOWSTATE_DEFINEDNESS enum value

**Example:**
```typescript
import { SNOWSTATE_DEFINEDNESS } from 'snowstate';

if (fsm.eventExists("update") !== SNOWSTATE_DEFINEDNESS.NOT_DEFINED) {
  // The update event is defined for the current state
}
```

#### `.enter(data?)`

Executes the enter function defined for the current state.

| Argument | Type | Description |
| --- | --- | --- |
| data? | any | Optional data to pass to the enter function |

**Returns:** SnowState instance

**Example:**
```typescript
fsm.enter();
```

#### `.leave(data?)`

Executes the leave function defined for the current state.

| Argument | Type | Description |
| --- | --- | --- |
| data? | any | Optional data to pass to the leave function |

**Returns:** SnowState instance

**Example:**
```typescript
fsm.leave();
```

### Transitions

#### `.addTransition(transitionName, sourceState, destState, condition?, leaveFunc?, enterFunc?)`

Adds a transition, which can be triggered to change the state under a given condition.

| Argument | Type | Description |
| --- | --- | --- |
| transitionName | string | Name of the transition |
| sourceState | string \| string[] \| "*" | State(s) to switch from (or "*" for any state) |
| destState | string \| "=" | State to switch to (or "=" for reflexive transition) |
| condition? | function | Condition function that returns boolean |
| leaveFunc? | function | Custom leave function |
| enterFunc? | function | Custom enter function |

**Returns:** SnowState (with updated type information)

**Example:**
```typescript
// Single source state
fsm.addTransition("attack", "idle", "attacking", () => hasSword);

// Multiple source states
fsm.addTransition("attack", ["idle", "walk"], "attacking", () => hasSword);
```

#### `.addWildcardTransition(transitionName, destState, condition?, leaveFunc?, enterFunc?)`

Adds a transition that can be triggered from any state.

| Argument | Type | Description |
| --- | --- | --- |
| transitionName | string | Name of the transition |
| destState | string | State to switch to |
| condition? | function | Condition function that returns boolean |
| leaveFunc? | function | Custom leave function |
| enterFunc? | function | Custom enter function |

**Returns:** SnowState (with updated type information)

**Example:**
```typescript
fsm.addWildcardTransition("stop", "idle");
```

#### `.addReflexiveTransition(transitionName, sourceState, condition?, leaveFunc?, enterFunc?)`

Adds a transition that switches a state to itself (resets the state).

| Argument | Type | Description |
| --- | --- | --- |
| transitionName | string | Name of the transition |
| sourceState | string | State that can perform this transition |
| condition? | function | Condition function that returns boolean |
| leaveFunc? | function | Custom leave function |
| enterFunc? | function | Custom enter function |

**Returns:** SnowState (with updated type information)

**Example:**
```typescript
fsm.addReflexiveTransition("reset", "idle");
```

#### `.transitionExists(transitionName, sourceState)`

Checks if a transition exists from a state.

| Argument | Type | Description |
| --- | --- | --- |
| transitionName | string | Name of the transition |
| sourceState | string | State to check transition from |

**Returns:** SNOWSTATE_DEFINEDNESS enum value

**Example:**
```typescript
import { SNOWSTATE_DEFINEDNESS } from 'snowstate';

if (fsm.transitionExists("reset", "idle") !== SNOWSTATE_DEFINEDNESS.NOT_DEFINED) {
  fsm.trigger("reset");
}
```

#### `.trigger(transitionName, data?)`

Triggers a transition.

| Argument | Type | Description |
| --- | --- | --- |
| transitionName | string | Name of the transition |
| data? | any | Optional data to pass to leave/enter functions |

**Returns:** SnowState instance

**Example:**
```typescript
fsm.trigger("attack");
```

### History

#### `.historyEnable()`

Enables history tracking.

**Returns:** SnowState instance

**Example:**
```typescript
fsm.historyEnable();
```

#### `.historyDisable()`

Disables history tracking.

**Returns:** SnowState instance

**Example:**
```typescript
fsm.historyDisable();
```

#### `.historyIsEnabled()`

Checks if history is being tracked.

**Returns:** boolean

**Example:**
```typescript
if (fsm.historyIsEnabled()) {
  console.log(fsm.historyGet());
}
```

#### `.historySetMaxSize(size)`

Sets the maximum storage capacity of state history.

| Argument | Type | Description |
| --- | --- | --- |
| size | number | Maximum history size |

**Returns:** SnowState instance

**Example:**
```typescript
fsm.historySetMaxSize(10);
```

#### `.historyGetMaxSize()`

Returns the maximum storage capacity of state history.

**Returns:** number

**Example:**
```typescript
const maxSize = fsm.historyGetMaxSize();
```

#### `.historyGet()`

Returns an array filled with the state history.

**Returns:** string[]

**Example:**
```typescript
const history = fsm.historyGet();
```

## TypeScript Support

SnowState.js is built with TypeScript and provides type inference. To best use type inference,
chain together the .add and .addTransition methods. The resulting fsm will be able to check
the types of event names and state names.

```typescript
import { createSnowState } from 'snowstate';

// Create a fully typed state machine
const player = createSnowState("idle")
  .add("idle", {
    enter: () => console.log("Entering idle state"),
    update: () => { },
    draw: () => { }
  });
  .add("walk", {
    enter: () => console.log("Entering walk state"),
    update: () => { },
    draw: () => { }
  });
  .addTransition("t_walk", "idle", "walk");

// Type error if you use an invalid state
player.change("walk"); // OK
player.change("running"); // Error! "running" wasn't previously added as a state

player.update(); // OK
player.draw(); // OK
player.step(); // Error! "step" wasn't previously aded as an event

player.trigger("t_walk"); // OK
player.trigger("t_run"); // Error! "t_run" wasn't previously added as a transition name
```