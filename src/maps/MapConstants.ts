export enum TILE {
  EMPTY = 0,
  FLOOR_NORMAL = 1,
  WALL_NORMAL = 2,
  FLOOR_VAULT = 3,
  FLOOR_SECURITY = 4,
  WALL_SECURITY = 5,
  WALL_REINFORCED = 6,
  FLOOR_OFFICE = 7,
  FLOOR_MAINTENANCE = 8,
  FLOOR_STORAGE = 9,
}

export enum ROOM {
  NONE = 0,
  ENTRY_LOBBY = 1,
  RECEPTION = 2,
  CENTRAL_HALL = 3,
  OFFICE_AREA = 4,
  SECURITY_ROOM = 5,
  SERVER_ROOM = 6,
  STORAGE = 7,
  RESTRICTED_CORRIDOR = 8,
  MAINTENANCE = 9,
  VAULT = 10,
  MAIN_EXIT = 11,
  SERVICE_EXIT = 12,
}

// Data structure to hold tile and room information for a grid cell
export interface GridCell {
  tile: TILE;
  room: ROOM;
}
