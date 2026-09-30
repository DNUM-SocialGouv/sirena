# Image de la restauration du dump SIREC : le client S3 qui récupère le dump sur
# le bucket et le client MariaDB qui l'importe, réunis dans une seule image
# publiée sur notre registre.
#
# Les deux clients sont republiés ici plutôt que tirés depuis leur registre
# d'origine à l'exécution du job, parce qu'un digest épingle le contenu d'une
# image, pas sa disponibilité : les images minio/mc ont disparu de docker.io puis
# de quay.io, cassant la restauration les deux fois. Désormais une panne de
# registre amont casse le build, plus la restauration.

# Client MariaDB, version alignée sur le serveur (services-integration/…/mariadb).
FROM mariadb:11.8.7

# Client S3 générique : l'endpoint et la région du fournisseur y sont des
# paramètres de premier ordre. rclone est un binaire Go statique, un COPY suffit.
COPY --from=rclone/rclone:1.75.1 /usr/local/bin/rclone /usr/local/bin/rclone

# Vérifie que le binaire tourne bien sur cette base : une future montée de
# version qui casserait cette compatibilité doit échouer au build, pas au milieu
# d'une restauration.
RUN rclone version
