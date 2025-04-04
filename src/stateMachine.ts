import { SnowStateError } from "./errors";

export enum SNOWSTATE_DEFINEDNESS {
  NOT_DEFINED = 0,
  DEFINED = 1,
  DEFAULT = 2,
}

export const SONWSTATE_WILDCARD_TRANSITION_NAME = "*";
export const SNOWSTATE_REFLEXIVE_TRANSITION_NAME = "=";

type StateMethod = () => void;
type LeaveEnterMethod = (data?: any) => void;

interface StateObjectBuiltin {
  enter?: LeaveEnterMethod;
  leave?: LeaveEnterMethod;
}

type MergeStateObject<CustomEvents extends Record<string, StateMethod> = {}> = StateObjectBuiltin & {
  [K in keyof CustomEvents]: CustomEvents[K];
};

type TransitionCondition = () => boolean;
interface TransitionRecord<StateNames extends string> {
  destState: StateNames | typeof SNOWSTATE_REFLEXIVE_TRANSITION_NAME;
  condition?: TransitionCondition;
  leaveFunc?: LeaveEnterMethod;
  enterFunc?: LeaveEnterMethod;
}

export interface SnowState<
  StateNames extends string = never,
  CustomEvents extends Record<string, StateMethod> = {},
  TransitionNames extends string = never
> {
  add<NewState extends string, StateEvents extends Record<string, StateMethod>>(
    stateName: NewState,
    stateObject: MergeStateObject<StateEvents>
  ): SnowStateWithTypes<StateNames | NewState, CustomEvents & StateEvents, TransitionNames>;
  change(stateName: StateNames, leaveFunc?: LeaveEnterMethod, enterFunc?: LeaveEnterMethod, data?: any): this;
  stateIs(stateName: StateNames, stateToCheck?: StateNames): boolean;
  stateExists(stateName: StateNames): boolean;
  getStates(): StateNames[];
  getCurrentState(): StateNames;
  getPreviousState(): StateNames | null;
  historyEnable(): this;
  historyDisable(): this;
  historyIsEnabled(): boolean;
  historySetMaxSize(size: number): this;
  historyGetMaxSize(): number;
  historyGet(): StateNames[];
  enter(): this;
  leave(): this;
  eventSetDefaultMethod<EventName extends string>(
    eventName: EventName,
    method: StateMethod
  ): SnowStateWithTypes<StateNames, CustomEvents & Record<EventName, StateMethod>, TransitionNames>;
  eventExists(eventName: string): SNOWSTATE_DEFINEDNESS;
  addTransition<SourceState extends StateNames, DestState extends StateNames, NewTransitionName extends string>(
    transitionName: NewTransitionName,
    sourceState: SourceState | SourceState[] | typeof SONWSTATE_WILDCARD_TRANSITION_NAME,
    destState: DestState | typeof SNOWSTATE_REFLEXIVE_TRANSITION_NAME,
    condition?: TransitionCondition,
    leaveFunc?: LeaveEnterMethod,
    enterFunc?: LeaveEnterMethod
  ): SnowStateWithTypes<StateNames, CustomEvents, TransitionNames | NewTransitionName>;
  trigger(transitionName: TransitionNames, data?: any): this;
  transitionExists(transitionName: TransitionNames, sourceState: StateNames): SNOWSTATE_DEFINEDNESS;
}

export class SnowState<
  StateNames extends string = never,
  CustomEvents extends Record<string, StateMethod> = {},
  TransitionNames extends string = never
> {
  protected state: StateNames;
  protected defaultEventMethods: Record<string, StateMethod> = {};
  protected stateObjects: Record<StateNames, MergeStateObject<CustomEvents>> = {} as Record<
    StateNames,
    MergeStateObject<CustomEvents>
  >;
  protected previousState: StateNames | null = null;
  protected stateHistory: StateNames[] = [];
  protected isHistoryEnabled: boolean = false;
  protected maxHistorySize: number = 10;
  protected stateStartTime: number = Date.now();
  protected addedEvents = new Set<string>(["enter", "leave"]);
  protected stateTransitions = new Map<StateNames, Map<TransitionNames, TransitionRecord<StateNames>[]>>();
  protected wildcardTransitions = new Map<TransitionNames, TransitionRecord<StateNames>[]>();

  constructor(initialState: string) {
    this.state = initialState as unknown as StateNames;
    this.stateStartTime = Date.now();
  }

  // *** State registration ***
  protected checkForIllegalKeys(eventNames: string[]): void {
    const illegalKeys = eventNames.filter((key) => {
      const existingDescriptor = Object.getOwnPropertyDescriptor(this, key);
      return existingDescriptor && !this.addedEvents.has(key);
    });

    if (illegalKeys.length > 0) {
      throw new SnowStateError(`Cannot use existing method/property name: ${illegalKeys.join(", ")}`);
    }
  }

  protected addMethodToStateMachine(eventName: string): void {
    if (this[eventName as keyof this]) {
      return;
    }

    this.addedEvents.add(eventName);
    (this as any)[eventName] = () => {
      const currentState = this.stateObjects[this.state];
      const stateMethod = currentState[eventName as keyof typeof currentState];

      if (typeof stateMethod === "function") {
        stateMethod();
      } else if (this.defaultEventMethods[eventName]) {
        this.defaultEventMethods[eventName]();
      }
    };
  }

  public eventSetDefaultMethod<EventName extends string>(
    eventName: EventName,
    method: StateMethod
  ): SnowStateWithTypes<StateNames, CustomEvents & Record<EventName, StateMethod>, TransitionNames> {
    this.checkForIllegalKeys([eventName]);
    this.defaultEventMethods[eventName] = method;
    this.addMethodToStateMachine(eventName);

    return this as SnowStateWithTypes<StateNames, CustomEvents & Record<EventName, StateMethod>, TransitionNames>;
  }

  public add<NewState extends string, StateEvents extends Record<string, StateMethod>>(
    stateName: NewState,
    stateObject: MergeStateObject<StateEvents>
  ): SnowStateWithTypes<StateNames | NewState, CustomEvents & StateEvents, TransitionNames> {
    this.checkForIllegalKeys(Object.keys(stateObject));

    // Use type assertion to bypass strict type checking
    (this.stateObjects as any)[stateName] = stateObject;

    // Add methods for each event in the state object
    Object.keys(stateObject).forEach((eventName) => {
      if (!this[eventName as keyof this]) {
        this.addMethodToStateMachine(eventName);
      }
    });

    // Use type assertion to bypass complex type inference
    return this as SnowStateWithTypes<StateNames | NewState, CustomEvents & StateEvents, TransitionNames>;
  }

  // *** State runtime ***
  public change(stateName: StateNames, leaveFunc?: LeaveEnterMethod, enterFunc?: LeaveEnterMethod, data?: any): this {
    if (!(stateName in this.stateObjects)) {
      throw new SnowStateError(`State '${stateName}' does not exist`);
    }

    // Invoke leave method
    const currentStateObject = this.stateObjects[this.state];
    if (leaveFunc) {
      // Use custom leave function if provided
      leaveFunc(data);
    } else {
      // Otherwise use the default leave method
      currentStateObject.leave?.();
    }

    // Update previous state
    this.previousState = this.state;

    // Update state history if enabled
    if (this.isHistoryEnabled) {
      this.stateHistory.push(this.state);
      if (this.stateHistory.length > this.maxHistorySize) {
        this.stateHistory.shift();
      }
    }

    // Change the state and reset start time
    this.state = stateName;
    this.stateStartTime = Date.now();

    // Invoke enter method of new state
    const newStateObject = this.stateObjects[stateName];
    if (enterFunc) {
      enterFunc(data);
    } else {
      newStateObject.enter?.();
    }

    return this;
  }

  public stateIs(stateName: StateNames): boolean {
    return stateName === this.state;
  }

  public stateExists(stateName: StateNames): boolean {
    return stateName in this.stateObjects;
  }

  public getStates(): StateNames[] {
    return Object.keys(this.stateObjects) as StateNames[];
  }

  // *** History ***
  public getCurrentState(): StateNames {
    return this.state;
  }

  public getPreviousState(): StateNames | null {
    return this.previousState;
  }

  public historyEnable(): this {
    this.isHistoryEnabled = true;
    return this;
  }

  public historyDisable(): this {
    this.isHistoryEnabled = false;
    return this;
  }

  public historyIsEnabled(): boolean {
    return this.isHistoryEnabled;
  }

  public historySetMaxSize(size: number): this {
    if (size < 1) {
      throw new SnowStateError("History size must be at least 1");
    }
    this.maxHistorySize = size;
    // Trim history if current size exceeds new max size
    if (this.stateHistory.length > size) {
      this.stateHistory = this.stateHistory.slice(-size);
    }
    return this;
  }

  public historyGetMaxSize(): number {
    return this.maxHistorySize;
  }

  public historyGet(): StateNames[] {
    return [...this.stateHistory];
  }

  public getTime(): number {
    return Date.now() - this.stateStartTime;
  }

  public setTime(time: number): this {
    if (time < 0) {
      throw new SnowStateError("Time cannot be negative");
    }
    // Set stateStartTime to a time in the past based on the provided time
    this.stateStartTime = Date.now() - time;
    return this;
  }

  // *** Event handling ***
  public enter(data?: any): this {
    const currentState = this.stateObjects[this.state];
    if (currentState.enter) {
      currentState.enter(data);
    } else {
      this.defaultEventMethods.enter?.();
    }
    return this;
  }

  public leave(data?: any): this {
    const currentState = this.stateObjects[this.state];
    if (currentState.leave) {
      currentState.leave(data);
    } else {
      this.defaultEventMethods.leave?.();
    }
    return this;
  }

  public eventExists(eventName: string): SNOWSTATE_DEFINEDNESS {
    const currentState = this.stateObjects[this.state];

    // Check if the event exists for the current state
    if (currentState && typeof currentState[eventName as keyof typeof currentState] === "function") {
      return SNOWSTATE_DEFINEDNESS.DEFINED;
    }

    // Check if a default method exists for the event
    if (this.defaultEventMethods[eventName]) {
      return SNOWSTATE_DEFINEDNESS.DEFAULT;
    }

    // Event is not defined
    return SNOWSTATE_DEFINEDNESS.NOT_DEFINED;
  }

  protected emptyLeaveMethod: LeaveEnterMethod = () => undefined;
  public eventGetCurrentLeaveMethod(): LeaveEnterMethod {
    const currentState = this.stateObjects[this.state];
    return currentState.leave ?? this.defaultEventMethods.leave ?? this.emptyLeaveMethod;
  }

  // *** Transitions ***
  public addTransition<SourceState extends StateNames, DestState extends StateNames, NewTransitionName extends string>(
    transitionName: NewTransitionName,
    sourceState: SourceState | SourceState[] | typeof SONWSTATE_WILDCARD_TRANSITION_NAME,
    destState: DestState | typeof SNOWSTATE_REFLEXIVE_TRANSITION_NAME,
    condition?: TransitionCondition,
    leaveFunc?: LeaveEnterMethod,
    enterFunc?: LeaveEnterMethod
  ): SnowStateWithTypes<StateNames, CustomEvents, TransitionNames | NewTransitionName> {
    const safeTransitionName = transitionName as unknown as TransitionNames;

    if (sourceState === SONWSTATE_WILDCARD_TRANSITION_NAME) {
      if (!this.wildcardTransitions.has(safeTransitionName)) {
        this.wildcardTransitions.set(safeTransitionName, []);
      }

      this.wildcardTransitions.get(safeTransitionName)!.push({
        destState,
        condition,
        leaveFunc,
        enterFunc,
      });
    } else {
      const sourceStateArray = Array.isArray(sourceState) ? sourceState : [sourceState];

      // check states
      for (const sourceState of sourceStateArray) {
        if (!(sourceState in this.stateObjects)) {
          throw new SnowStateError(`Source state '${sourceState}' does not exist`);
        }
        if (!(destState in this.stateObjects)) {
          throw new SnowStateError(`Destination state '${destState}' does not exist`);
        }
      }

      for (const sourceState of sourceStateArray) {
        if (!this.stateTransitions.has(sourceState)) {
          this.stateTransitions.set(sourceState, new Map());
        }

        const transitions = this.stateTransitions.get(sourceState)!;

        if (!transitions.has(safeTransitionName)) {
          transitions.set(safeTransitionName, []);
        }

        transitions.get(safeTransitionName)!.push({
          destState,
          condition,
          leaveFunc,
          enterFunc,
        });
      }
    }

    return this as SnowStateWithTypes<StateNames, CustomEvents, TransitionNames | NewTransitionName>;
  }

  public trigger(transitionName: TransitionNames, data?: any): this {
    // Check if there are any transitions for the current state
    const stateTransitions = this.stateTransitions.get(this.state);

    // First, check specific state transitions
    if (stateTransitions) {
      const transitions = stateTransitions.get(transitionName);
      if (transitions && transitions.length > 0) {
        for (const transition of transitions) {
          if (!transition.condition || transition.condition()) {
            const destState = transition.destState == SNOWSTATE_REFLEXIVE_TRANSITION_NAME ? this.state : transition.destState;
            return this.change(destState, transition.leaveFunc, transition.enterFunc, data);
          }
        }
      }
    }

    // Then check wildcard transitions
    const wildcardTransitions = this.wildcardTransitions.get(transitionName);
    if (wildcardTransitions) {
      for (const transition of wildcardTransitions) {
        if (!transition.condition || transition.condition()) {
          const destState = transition.destState == SNOWSTATE_REFLEXIVE_TRANSITION_NAME ? this.state : transition.destState;
          return this.change(destState, transition.leaveFunc, transition.enterFunc, data);
        }
      }
    }

    return this;
  }

  public addWildcardTransition<DestState extends StateNames, NewTransitionName extends string>(
    transitionName: NewTransitionName,
    destState: DestState,
    condition?: TransitionCondition,
    leaveFunc?: LeaveEnterMethod,
    enterFunc?: LeaveEnterMethod
  ): SnowStateWithTypes<StateNames, CustomEvents, TransitionNames | NewTransitionName> {
    return this.addTransition(transitionName, SONWSTATE_WILDCARD_TRANSITION_NAME, destState, condition, leaveFunc, enterFunc);
  }

  public addReflexiveTransition<SourceState extends StateNames, NewTransitionName extends string>(
    transitionName: NewTransitionName,
    sourceState: SourceState,
    condition?: TransitionCondition,
    leaveFunc?: LeaveEnterMethod,
    enterFunc?: LeaveEnterMethod
  ): SnowStateWithTypes<StateNames, CustomEvents, TransitionNames | NewTransitionName> {
    return this.addTransition(transitionName, sourceState, SNOWSTATE_REFLEXIVE_TRANSITION_NAME, condition, leaveFunc, enterFunc);
  }

  public transitionExists(transitionName: TransitionNames, sourceState: StateNames): SNOWSTATE_DEFINEDNESS {
    // Check specific state transitions
    const stateTransitions = this.stateTransitions.get(sourceState);
    if (stateTransitions?.has(transitionName)) {
      return SNOWSTATE_DEFINEDNESS.DEFINED;
    }

    // Check wildcard transitions
    if (this.wildcardTransitions.has(transitionName)) {
      return SNOWSTATE_DEFINEDNESS.DEFINED;
    }

    // No transitions found
    return SNOWSTATE_DEFINEDNESS.NOT_DEFINED;
  }
}

// Update factory function type
export type SnowStateWithTypes<
  StateNames extends string,
  CustomEvents extends Record<string, StateMethod> = {},
  TransitionNames extends string = never
> = SnowState<StateNames, CustomEvents, TransitionNames> & {
  [K in keyof CustomEvents]: () => void;
};

export function createSnowState<StateNames extends string = never, TransitionNames extends string = never>(
  initialState: string
): SnowStateWithTypes<StateNames, {}, TransitionNames> {
  return new SnowState<StateNames, {}, TransitionNames>(initialState) as SnowStateWithTypes<
    StateNames,
    {},
    TransitionNames
  >;
}
