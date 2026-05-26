export interface SavedPlaceProps {
  id: string;
  familyId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  createdBy: string | null;
  createdAt: Date;
}

export class SavedPlace {
  readonly id: string;
  readonly familyId: string;
  readonly name: string;
  readonly address: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;

  constructor(props: SavedPlaceProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this.name = props.name;
    this.address = props.address;
    this.lat = props.lat;
    this.lng = props.lng;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
  }
}
