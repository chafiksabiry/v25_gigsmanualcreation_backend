#!/bin/bash

echo "🔍 Test de l'API Countries externe sur le port 5011..."
echo ""

# Test de base
echo "📡 Test GET /api/countries:"
curl -s -H "Content-Type: application/json" "http://localhost:5011/api/countries" | jq '.success, (.data | length)' 2>/dev/null || echo "❌ Erreur: jq non installé ou API non accessible"

echo ""
echo "📡 Test avec limite:"
curl -s -H "Content-Type: application/json" "http://localhost:5011/api/countries?limit=5" | jq '.success, (.data | length)' 2>/dev/null || echo "❌ Erreur: jq non installé ou API non accessible"

echo ""
echo "✅ Test terminé"
