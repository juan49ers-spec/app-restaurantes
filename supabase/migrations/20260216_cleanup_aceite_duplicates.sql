-- Deletion of 7 unused 'Aceite Oliva' duplicates in restaurant 46c04619-6638-47e4-bb35-8981a05705e5
-- Executed on 2026-02-16 to resolve user confusion and "Phantom Success" deletions.
DELETE FROM master_ingredients
WHERE id IN (
        '1139af97-3def-4a70-b254-448bd38d4db3',
        'f4609e42-5c30-402d-a027-bfd665564b0a',
        '0db6a2a4-2b0b-41b8-a2d6-044b638f1737',
        'a2b6f5d4-7e5f-4d0f-aed3-10f3fbdcb264',
        'cca3b7b6-9d82-4235-8247-34b203e6d873',
        'b368e2d0-d79d-46c1-9580-32d65437e99b',
        '1c69a6af-aa2a-4627-965b-e6069dd15b9a'
    );