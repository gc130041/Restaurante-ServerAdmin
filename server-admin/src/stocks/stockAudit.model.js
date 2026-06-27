import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Modelo de Auditoría de Stock (inmutable).
 * Registra cada acción sobre el inventario para garantizar trazabilidad de cambios.
 */
const stockAuditSchema = new Schema({
    stockId:      { type: Schema.Types.ObjectId, ref: 'Stock', required: true, index: true },
    ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    
    // Actor que realiza la acción
    actorId:   { type: String, required: true },
    actorRole: { type: String, required: true },
    actorName: { type: String, required: true },
    
    // Acción realizada
    action: {
        type: String, required: true,
        enum: [
            'STOCK_CREATED',
            'STOCK_UPDATED',
            'QUANTITY_ADJUSTED',
            'MIN_STOCK_CHANGED'
        ]
    },
    
    // Detalles del cambio
    details: {
        previousQuantity: { type: Number },
        newQuantity:      { type: Number },
        previousMinStock: { type: Number },
        newMinStock:      { type: Number },
        reason:           { type: String, required: true }, // Motivo de la modificación
        description:      { type: String }
    },
    
    // Contexto operativo
    branchId:  { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
    ipAddress: { type: String }
}, {
    timestamps: { createdAt: 'performedAt', updatedAt: false },
    versionKey: false
});

// Índices para búsquedas rápidas
stockAuditSchema.index({ stockId: 1, performedAt: -1 });
stockAuditSchema.index({ ingredientId: 1, performedAt: -1 });

/**
 * INMUTABILIDAD: Bloquea cualquier operación de edición o borrado.
 */
stockAuditSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function (next) {
    next(new Error('Los registros de auditoría de inventario son inmutables.'));
});

export default mongoose.model('StockAudit', stockAuditSchema);
