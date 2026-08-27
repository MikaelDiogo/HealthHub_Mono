import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Paciente } from "./Pacientes.js";

@Entity("sinais_vitais")
export class SinaisVitais {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("uuid") // MUDANÇA: Tipo direto como string
    patient_id!: string;

    @Column("int") // MUDANÇA: Define explicitamente como 'int' para o campo hora
    hora!: number;

    @Column("float", { nullable: true }) // MUDANÇA: Tipo antes do objeto de opções
    frequencia_cardiaca?: number; 

    @Column("float", { nullable: true })
    saturacao_oxigenio?: number;

    @Column("varchar", { nullable: true }) // MUDANÇA: Define como varchar explicitamente
    pressao_arterial?: string; 

    @Column("float", { nullable: true })
    temperatura?: number;

    @Column("timestamp", { 
        default: () => "CURRENT_TIMESTAMP" 
    })
    created_at!: Date;

    @ManyToOne(() => Paciente, (paciente) => paciente.sinaisVitais, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "patient_id" })
    paciente!: Paciente; 
}