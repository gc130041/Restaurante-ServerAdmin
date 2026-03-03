import { Schema, model } from "mongoose";

const OrderSchema = new Schema(
  {
    table: {
      type: Schema.Types.ObjectId,
      ref: "Table",
      required: [true, "La mesa es obligatoria"]
    },
    waiter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El mesero es obligatorio"]
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: [true, "El restaurante es obligatorio"]
    },
    items: [
      {
        menuItem: {
          type: Schema.Types.ObjectId,
          ref: "Menu",
          required: [true, "El platillo es obligatorio"]
        },
        quantity: {
          type: Number,
          required: [true, "La cantidad es obligatoria"],
          min: [1, "La cantidad mínima es 1"]
        },
        modifiers: {
          type: [String],
          default: [],
        },
        status: {
          type: String,
          enum: ["EN_ESPERA", "EN_COCINA", "LISTO", "SERVIDO"],
          default: "EN_ESPERA"
        },
        notes: {
          type: String,
          default: ""
        },
        price: {
          type: Number,
          required: true
        }
      }
    ],
    status: {
      type: String,
      enum: ["ABIERTA", "CERRADA", "CANCELADA"],
      default: "ABIERTA"
    },
    total: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

OrderSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    this.total = this.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  } else {
    this.total = 0;
  }
  next();
});

export default model("Order", OrderSchema);