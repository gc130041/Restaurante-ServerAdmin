export const ITEM_STATES = {
    EN_ESPERA: "EN_ESPERA",
    EN_COCINA: "EN_COCINA",
    LISTO: "LISTO",
    SERVIDO: "SERVIDO"
};

const VALID_TRANSITIONS = {
    [ITEM_STATES.EN_ESPERA]: [ITEM_STATES.EN_COCINA],
    [ITEM_STATES.EN_COCINA]: [ITEM_STATES.LISTO],
    [ITEM_STATES.LISTO]: [ITEM_STATES.SERVIDO],
    [ITEM_STATES.SERVIDO]: [] 
};

export const canTransitionTo = (currentStatus, nextStatus) => {
    const allowed = VALID_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(nextStatus) : false;
};