import {model, Schema} from "mongoose";

const OrderSchema = new Schema(
    {
        tables: [{
            type: Schema.Types.ObjectId,
            ref: "Table",
            required: [true, "Al menos una mesa es obligatoria"]
        }],
        waiter: {
            type: String,
            required: [true, "El mesero es obligatorio"]
        },
        branch: {
            type: Schema.Types.ObjectId,
            ref: "Branch",
            required: [true, "La sucursal es obligatoria"]
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
                    enum: ["pending", "in-kitchen", "ready", "delivered", "paid", "cancelled"],
                    default: "pending"
                },
                notes: {
                    type: String,
                    default: ""
                },
                priceAtTime: {
                    type: Number,
                    required: true
                }
            }
        ],
        status: {
            type: String,
            enum: ["pending", "in-kitchen", "ready", "delivered", "paid", "cancelled"],
            default: "pending"
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

OrderSchema.pre("save", function () {
    if (this.items && this.items.length > 0) {
        this.total = this.items.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
    } else {
        this.total = 0;
    }
});

export default model("Order", OrderSchema);