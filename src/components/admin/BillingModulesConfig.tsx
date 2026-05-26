'use client';

import { useState, useEffect } from 'react';
import { BillingModule } from '@/types/billing';
import { getBillingModulesConfig, updateBillingModule } from '@/app/actions/billing-config';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Loader2, Plus, X } from 'lucide-react';

export function BillingModulesConfig() {
    const [modules, setModules] = useState<BillingModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    async function loadConfig() {
        try {
            const data = await getBillingModulesConfig();
            setModules((data || []).map(module => ({
                ...module,
                features: Array.isArray(module.features) ? module.features : [],
            })));
        } catch {
            toast.error('Error al cargar la configuración de módulos');
        } finally {
            setLoading(false);
        }
    }

    const handleUpdateField = <K extends keyof BillingModule>(id: string, field: K, value: BillingModule[K]) => {
        setModules(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const handleFeatureChange = (id: string, index: number, value: string) => {
        setModules(prev => prev.map(m => {
            if (m.id === id) {
                const newFeatures = [...(m.features || [])];
                newFeatures[index] = value;
                return { ...m, features: newFeatures };
            }
            return m;
        }));
    };

    const addFeature = (id: string) => {
        setModules(prev => prev.map(m => m.id === id ? { ...m, features: [...(m.features || []), ' Nueva característica'] } : m));
    };

    const removeFeature = (id: string, index: number) => {
        setModules(prev => prev.map(m => {
            if (m.id === id) {
                const newFeatures = (m.features || []).filter((_, i) => i !== index);
                return { ...m, features: newFeatures };
            }
            return m;
        }));
    };

    const saveModule = async (module: BillingModule) => {
        setSaving(module.id);
        try {
            const result = await updateBillingModule({
                id: module.id,
                name: module.name,
                description: module.description || '',
                price_monthly: Number(module.price_monthly),
                price_yearly: Number(module.price_yearly),
                features: module.features,
                is_active: module.is_active
            });

            if (result.success) {
                toast.success(`Módulo ${module.name} actualizado`);
            } else {
                toast.error('Error al guardar los cambios');
            }
        } catch {
            toast.error('Error de red al guardar');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modules.map((module) => (
                    <Card key={module.id} className={module.is_base ? "border-primary/50 bg-primary/5" : ""}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        {module.name}
                                        {module.is_base && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase">Base</span>}
                                    </CardTitle>
                                    <CardDescription>ID: {module.id}</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor={`active-${module.id}`} className="text-xs">Activo</Label>
                                    <Switch
                                        id={`active-${module.id}`}
                                        checked={module.is_active}
                                        onCheckedChange={(val) => handleUpdateField(module.id, 'is_active', val)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Precio Mensual (€)</Label>
                                    <Input
                                        type="number"
                                        value={module.price_monthly}
                                        onChange={(e) => handleUpdateField(module.id, 'price_monthly', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Precio Anual (€)</Label>
                                    <Input
                                        type="number"
                                        value={module.price_yearly}
                                        onChange={(e) => handleUpdateField(module.id, 'price_yearly', Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Descripción</Label>
                                <Input
                                    value={module.description || ''}
                                    onChange={(e) => handleUpdateField(module.id, 'description', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs flex justify-between">
                                    Características
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => addFeature(module.id)}>
                                        <Plus className="w-3 h-3 mr-1" /> Añadir
                                    </Button>
                                </Label>
                                <div className="space-y-2">
                                    {(module.features || []).map((feature, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input
                                                className="text-sm h-8"
                                                value={feature}
                                                onChange={(e) => handleFeatureChange(module.id, idx, e.target.value)}
                                            />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFeature(module.id, idx)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button
                                className="w-full mt-4"
                                disabled={saving === module.id}
                                onClick={() => saveModule(module)}
                            >
                                {saving === module.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Guardar Cambios
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
