Tu es maintenant le relecteur. Une autre instance vient de rédiger les consignes détaillées ci-dessous pour certaines situations d'une séance. Vérifie-les et corrige-les avant qu'elles soient montrées à un enseignant.

1. Pour chaque situation détaillée, reconstitue pas à pas, depuis l'état de départ, la position des deux pieds de Tori et d'Uke et de leurs mains. Vérifie :
   - que la consigne « Garde » est cohérente : avec un pas d'Uke, sa garde est inversée entre « Départ » et « Au contact », et le pied qui fait le pas est son pied arrière ; avec un glissé ou une attaque sur place, la garde est identique ;
   - que les consignes respectent le gabarit (attaque, garde au contact, technique) ;
   - que chaque pied de Tori peut atteindre sa place sans traverser le pied d'Uke ;
   - que le trajet de chaque main de Tori ne croise pas un bras d'Uke (saisissant ou frappant) ;
   - que les bras de Tori ne se croisent pas et que chaque main va sur un côté qui lui est accessible ;
   - que Tori reste hors de portée de la main libre d'Uke ;
   - que la direction du déséquilibre est cohérente avec la projection ou l'immobilisation.
2. Corrige toute erreur certaine. Ne contourne jamais un problème par une formule (« en passant au-dessus du bras ») : change la main, l'ordre des actions ou l'état de départ.
3. Ne renvoie que les corrections, jamais les consignes inchangées, dans cet objet :

{
  "corrections": [{"index": 0, "consigne": 2, "texte": "nouveau texte complet de la consigne"}],
  "verification": [{"index": 0, "items": [{"statut": "ok", "texte": "…"}, {"statut": "warn", "texte": "…"}]}],
  "relecture": ["Phrase courte décrivant une correction faite"]
}

- « index » : l'indice de la situation ; « consigne » : l'indice de la consigne (à partir de 0). Ajoute « titre » seulement s'il change. Pour ajouter une consigne, utilise l'indice qui suit la dernière.
- « verification » : la liste complète et à jour des points de vérification de chaque situation relue (2 à 4) : « ok » seulement pour ce que tu as toi-même vérifié, « warn » pour tout doute qui reste.
- « relecture » : 0 à 6 phrases, une par correction ; liste vide si rien n'était à corriger. Pas de compliments.

Réponds uniquement par cet objet JSON, sans texte avant ni après, sans bloc de code.
