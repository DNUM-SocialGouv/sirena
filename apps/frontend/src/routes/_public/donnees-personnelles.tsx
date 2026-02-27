import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_public/donnees-personnelles')({
  component: DonneesPersonnellesPage,
});

export function DonneesPersonnellesPage() {
  return (
    <>
      <h1>Données personnelles</h1>
      <p>
        L’État met en œuvre un système d’information pour assurer la gestion des réclamations émanant des usagers du
        système de santé, social et médico-social, y compris lorsque ces réclamations constituent des signalements de
        faits constitutifs d'une maltraitance envers les personnes majeures en situation de vulnérabilité du fait de
        leur âge ou de leur handicap tel que prévu à l’article L.119-2 du code de l’action sociale et des familles.
      </p>
      <p>
        La direction générale de la cohésion sociale (DGCS) et le secrétariat général des ministères chargés des
        affaires sociales (SGMAS) sont responsables conjoints du traitement des données recueillies dans cet outil
        dénommé SIRENA.
      </p>
      <p>Ce traitement de données a pour finalités de :</p>
      <ul>
        <li>Recueillir et centraliser les réclamations déposées ;</li>
        <li>Affecter ces réclamations aux autorités administratives compétentes pour assurer leur traitement ;</li>
        <li>Permettre à ces autorités d’assurer la gestion et le suivi de ces réclamations ;</li>
        <li>
          Produire des données statistiques à des fins d’appui et d’amélioration des politiques publiques relatives à la
          protection des personnes majeures en situation de vulnérabilité et à la prise en charge sanitaire, sociale et
          médico-sociale.
        </li>
      </ul>

      <p>
        Ce traitement de données est mis en œuvre pour l'exécution d'une mission d'intérêt public, conformément au e du
        paragraphe 1 de l'article 6 du règlement <abbr title="Union Européenne">(UE)</abbr> 2016/679 du 27 avril 2016 et
        pour les motifs d'intérêt public mentionnés au g du paragraphe 2 de l'article 9 du même règlement.
      </p>
      <p>Les données collectées sont communiquées aux seuls destinataires suivants :</p>
      <ul>
        <li>
          Le ou les service(s) en charge du traitement du dossier au niveau territorial et aux agents habilités à les
          traiter : agences régionales de santé (ARS), conseils départementaux et services du représentant de l’Etat
          dans les départements ;
        </li>
        <li>
          Le cas échéant, les sous-traitants en charge de l’exploitation technique de l’application dans la limite des
          finalités de maintenance et de fonctionnement technique de l’application ;
        </li>
        <li>
          Pour les données statistiques produites les services centraux du ministère chargé de la santé et des affaires
          sociales et les agences régionales de santé.
        </li>
      </ul>

      <h2>Durée de conservation</h2>
      <p>
        Les données relatives aux dossiers déposés sont conservées pendant un an maximum à compter de la clôture du
        dossier par le service en charge de son instruction.
      </p>
      <p>À l’issue de cette période, les données sont conservées pour une durée maximale de six ans.</p>
      <p>
        Les données techniques et de traçabilité liées à l'utilisation du traitement mentionné font l'objet d'un
        enregistrement et sont conservées pendant une durée d’un an. Les données de comptes des agents sont conservées
        pendant une durée maximale d’un an à compter de la date de désactivation de leur compte. Vous pouvez accéder aux
        données vous concernant, les rectifier, demander leur effacement ou exercer votre droit à la limitation du
        traitement de vos données.
      </p>
      <p>
        Consultez le site de la{' '}
        <a href="https://cnil.fr" target="_blank" rel="noopener noreferrer">
          Commission Nationale de l'Informatique et des Libertes (CNIL)
          <span className="fr-sr-only">nouvelle fenêtre</span>
        </a>{' '}
        pour plus d’informations sur vos droits.
      </p>
      <p>
        Pour exercer ces droits ou pour toute question sur le traitement de vos données dans ce dispositif, vous pouvez
        contacter le ou les service(s) en charge du traitement de votre dossier.
      </p>
      <p>
        Leurs coordonnées vous seront communiquées dès la réception du dossier de réclamation par le ou les services
        compétents.
      </p>
      <p>
        Si vous estimez, après avoir contacté ce ou ces service(s), que vos droits « Informatique et Libertés » ne sont
        pas respectés, vous pouvez adresser une réclamation à la{' '}
        <abbr
          title="            Commission Nationale de l'Informatique et des Libertes (CNIL)
"
        >
          CNIL{' '}
        </abbr>
        :{' '}
        <a
          href="https://www.cnil.fr/fr/cnil-direct/question/adresser-une-reclamation-plainte-la-cnil-quelles-conditions-et-comment"
          target="_blank"
          rel="noopener noreferrer"
        >
          Besoin d'aide, Posez votre question, la CNIL vous répond.
          <span className="fr-sr-only">nouvelle fenêtre</span>
        </a>
      </p>
    </>
  );
}
