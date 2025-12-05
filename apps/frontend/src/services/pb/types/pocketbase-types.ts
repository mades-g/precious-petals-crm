/**
 * Based on pocketbase-typegen output.
 */
import type PocketBase from "pocketbase";
import type { RecordService } from "pocketbase";

export type Collections =
  | "_authOrigins"
  | "_externalAuths"
  | "_mfas"
  | "_otps"
  | "_superusers"
  | "customers"
  | "order_frame_items"
  | "order_paperweight_items"
  | "orders"
  | "users";

/* -----------------------------------------------------------------------------
 * Aliases
 * -------------------------------------------------------------------------- */

export type IsoDateString = string;
export type IsoAutoDateString = string & { readonly autodate: unique symbol };
export type RecordIdString = string;
export type FileNameString = string & { readonly filename: unique symbol };
export type HTMLString = string;

export type ExpandType<T> = unknown extends T
  ? T extends unknown
    ? { expand?: unknown }
    : { expand: T }
  : { expand: T };

/* -----------------------------------------------------------------------------
 * System fields
 * -------------------------------------------------------------------------- */

export type BaseSystemFields<T = unknown> = {
  id: RecordIdString;
  collectionId: string;
  collectionName: Collections;
} & ExpandType<T>;

export type AuthSystemFields<T = unknown> = {
  email: string;
  emailVisibility: boolean;
  username: string;
  verified: boolean;
} & BaseSystemFields<T>;

/* -----------------------------------------------------------------------------
 * Record types for each collection
 * -------------------------------------------------------------------------- */

export type AuthoriginsRecord = {
  collectionRef: string;
  created: IsoAutoDateString;
  fingerprint: string;
  id: string;
  recordRef: string;
  updated: IsoAutoDateString;
};

export type ExternalauthsRecord = {
  collectionRef: string;
  created: IsoAutoDateString;
  id: string;
  provider: string;
  providerId: string;
  recordRef: string;
  updated: IsoAutoDateString;
};

export type MfasRecord = {
  collectionRef: string;
  created: IsoAutoDateString;
  id: string;
  method: string;
  recordRef: string;
  updated: IsoAutoDateString;
};

export type OtpsRecord = {
  collectionRef: string;
  created: IsoAutoDateString;
  id: string;
  password: string;
  recordRef: string;
  sentTo?: string;
  updated: IsoAutoDateString;
};

export type SuperusersRecord = {
  created: IsoAutoDateString;
  email: string;
  emailVisibility?: boolean;
  id: string;
  password: string;
  tokenKey: string;
  updated: IsoAutoDateString;
  verified?: boolean;
};

export type CustomersTitleOptions = "Mrs" | "Mr" | "Miss";

export type CustomersHowRecommendedOptions =
  | "Google"
  | "Friend / Family"
  | "Florist"
  | "Wedding planner";

export type CustomersRecord = {
  created: IsoAutoDateString;
  email: string;
  firstName: string;
  howRecommended?: CustomersHowRecommendedOptions;
  id: string;
  orderId?: RecordIdString;
  surname: string;
  telephone: string;
  title?: CustomersTitleOptions;
  updated: IsoAutoDateString;
};

export type OrderFrameItemsFrameMountColourOptions =
  | "Cream - 8674"
  | "Red - 8020"
  | "Burgundy - 8151"
  | "Gold - 8246"
  | "Sage - 8633"
  | "Silver - 835"
  | "Blue - 8168"
  | "Purple - 8146"
  | "Navy - 8687"
  | "Pink - 8064"
  | "Maroon - 8016"
  | "Light Grey - 8664"
  | "Bright white - 897";

export type OrderFrameItemsFrameTypeOptions =
  | "Black"
  | "Dark wood gold line"
  | "Oak"
  | "Beech"
  | "Cottage pine"
  | "Bronze"
  | "Antique gold"
  | "Speckled gold"
  | "Antique silver"
  | "Speckled silver"
  | "New modern silver"
  | "Distressed white"
  | "Modern white"
  | "Distressed white wide"
  | "Pewter"
  | "New pewter gunmetal"
  | "Flat white"
  | "Brushed silver"
  | "Stone gold"
  | "Stone silver";

export type OrderFrameItemsLayoutOptions =
  | "Hand tied birds eve"
  | "Hand tied side profile"
  | "Hand tied side profile diagonal"
  | "Straight on shower or teardrop"
  | "Meadow";

export type OrderFrameItemsGlassTypeOptions =
  | "Clearview uv glass"
  | "Conservation glass";

export type OrderFrameItemsInclusionsOptions = "Yes" | "No" | "Buttonhole";

export type OrderFrameItemsPreservationTypeOptions = "3D" | "pressed";

export type OrderFrameItemsRecord<Textras = unknown> = {
  artistHours: number;
  artworkComplete?: boolean;
  created: IsoAutoDateString;
  extras?: null | Textras;
  frameType: OrderFrameItemsFrameTypeOptions;
  framingComplete?: boolean;
  glassEngraving?: string;
  glassType: OrderFrameItemsGlassTypeOptions;
  id: string;
  inclusions: OrderFrameItemsInclusionsOptions;
  layout: OrderFrameItemsLayoutOptions;
  preservationDate?: IsoDateString;
  preservationType: OrderFrameItemsPreservationTypeOptions;
  frameMountColour: OrderFrameItemsFrameMountColourOptions;
  price: number;
  sizeX: string;
  sizeY: string;
  special_notes?: string;
  updated: IsoAutoDateString;
};

export type OrderPaperweightItemsRecord = {
  created: IsoAutoDateString;
  id: string;
  paperweightReceived?: boolean;
  price: number;
  quantity: number;
  updated: IsoAutoDateString;
};

export type OrdersPaymentStatusOptions =
  | "wainting_first_deposit"
  | "waiting_second_deposit"
  | "waiting_final_balance"
  | "first_deposit_paid"
  | "second_deposit_paid"
  | "final_balance_paid";

export type OrdersOrderStatusOptions =
  | "in_progress"
  | "ready"
  | "delivered"
  | "cancelled"
  | "draft";

export type OrdersRecord = {
  created: IsoAutoDateString;
  frameOrderId?: RecordIdString[];
  id: string;
  notes?: string;
  occasionDate: IsoDateString;
  orderNo: number;
  orderStatus?: OrdersOrderStatusOptions;
  paperweightOrderId?: RecordIdString;
  payment_status?: OrdersPaymentStatusOptions;
  updated: IsoAutoDateString;

  // New structured billing address fields
  billingAddressLine1: string;
  billingAddressLine2?: string;
  billingTown: string;
  billingCounty?: string;
  billingPostcode: string;

  // New structured delivery address fields
  deliverySameAsBilling?: boolean;
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryTown?: string;
  deliveryCounty?: string;
  deliveryPostcode?: string;
};

export type UsersRecord = {
  avatar?: FileNameString;
  created: IsoAutoDateString;
  email: string;
  emailVisibility?: boolean;
  id: string;
  name?: string;
  password: string;
  tokenKey: string;
  updated: IsoAutoDateString;
  verified?: boolean;
};

/* -----------------------------------------------------------------------------
 * Response types include system fields and match PB API responses
 * -------------------------------------------------------------------------- */

export type AuthoriginsResponse<Texpand = unknown> =
  Required<AuthoriginsRecord> & BaseSystemFields<Texpand>;
export type ExternalauthsResponse<Texpand = unknown> =
  Required<ExternalauthsRecord> & BaseSystemFields<Texpand>;
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> &
  BaseSystemFields<Texpand>;
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> &
  BaseSystemFields<Texpand>;
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> &
  AuthSystemFields<Texpand>;
export type CustomersResponse<Texpand = unknown> = Required<CustomersRecord> &
  BaseSystemFields<Texpand>;
export type OrderFrameItemsResponse<
  Textras = unknown,
  Texpand = unknown,
> = Required<OrderFrameItemsRecord<Textras>> & BaseSystemFields<Texpand>;
export type OrderPaperweightItemsResponse<Texpand = unknown> =
  Required<OrderPaperweightItemsRecord> & BaseSystemFields<Texpand>;
export type OrdersResponse<Texpand = unknown> = Required<OrdersRecord> &
  BaseSystemFields<Texpand>;
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> &
  AuthSystemFields<Texpand>;

/* -----------------------------------------------------------------------------
 * Types containing all Records and Responses
 * -------------------------------------------------------------------------- */

export type CollectionRecords = {
  _authOrigins: AuthoriginsRecord;
  _externalAuths: ExternalauthsRecord;
  _mfas: MfasRecord;
  _otps: OtpsRecord;
  _superusers: SuperusersRecord;
  customers: CustomersRecord;
  order_frame_items: OrderFrameItemsRecord;
  order_paperweight_items: OrderPaperweightItemsRecord;
  orders: OrdersRecord;
  users: UsersRecord;
};

export type CollectionResponses = {
  _authOrigins: AuthoriginsResponse;
  _externalAuths: ExternalauthsResponse;
  _mfas: MfasResponse;
  _otps: OtpsResponse;
  _superusers: SuperusersResponse;
  customers: CustomersResponse;
  order_frame_items: OrderFrameItemsResponse;
  order_paperweight_items: OrderPaperweightItemsResponse;
  orders: OrdersResponse;
  users: UsersResponse;
};

/* -----------------------------------------------------------------------------
 * Utility types for create/update operations
 * -------------------------------------------------------------------------- */

type ProcessCreateAndUpdateFields<T> = Omit<
  {
    // Omit AutoDate fields
    [K in keyof T as Extract<T[K], IsoAutoDateString> extends never
      ? K
      : never]: T[K] extends infer U // Convert FileNameString to File
      ? U extends FileNameString | FileNameString[]
        ? U extends unknown[]
          ? File[]
          : File
        : U
      : never;
  },
  "id"
>;

// Create type for Auth collections
export type CreateAuth<T> = {
  id?: RecordIdString;
  email: string;
  emailVisibility?: boolean;
  password: string;
  passwordConfirm: string;
  verified?: boolean;
} & ProcessCreateAndUpdateFields<T>;

// Create type for Base collections
export type CreateBase<T> = {
  id?: RecordIdString;
} & ProcessCreateAndUpdateFields<T>;

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
  Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
  email?: string;
  emailVisibility?: boolean;
  oldPassword?: string;
  password?: string;
  passwordConfirm?: string;
  verified?: boolean;
};

// Update type for Base collections
export type UpdateBase<T> = Partial<
  Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>;

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
  CollectionResponses[T] extends AuthSystemFields
    ? CreateAuth<CollectionRecords[T]>
    : CreateBase<CollectionRecords[T]>;

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
  CollectionResponses[T] extends AuthSystemFields
    ? UpdateAuth<CollectionRecords[T]>
    : UpdateBase<CollectionRecords[T]>;

/* -----------------------------------------------------------------------------
 * TypedPocketBase helper
 * -------------------------------------------------------------------------- */

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions
export type TypedPocketBase = {
  collection<T extends keyof CollectionResponses>(
    idOrName: T,
  ): RecordService<CollectionResponses[T]>;
} & PocketBase;
