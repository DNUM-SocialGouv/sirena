import { gql } from 'graphql-request';

export const getRequetesQuery = gql`
fragment RootChampFragment on Champ {
  ... on RepetitionChamp {
    champs {
      ...ChampFragment
    }
  }
}
fragment ChampFragment on Champ {
  id
  label
  stringValue
  ... on DateChamp {
    date
  }
  ... on DatetimeChamp {
    datetime
  }
  ... on CheckboxChamp {
    checked: value
  }
  ... on DecimalNumberChamp {
    decimalNumber: value
  }
  ... on IntegerNumberChamp {
    integerNumber: value
  }
  ... on CiviliteChamp {
    civilite: value
  }
  ... on LinkedDropDownListChamp {
    primaryValue
    secondaryValue
  }
  ... on MultipleDropDownListChamp {
    values
  }
  ... on PieceJustificativeChamp {
    file {
      filename
      url
    }
  }
}
query getDossiers($demarcheNumber: Int!) {
  demarche(number: $demarcheNumber) {
    dossiers {
      pageInfo {
        startCursor
        endCursor
        hasPreviousPage
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          number
          datePassageEnConstruction
          dateDerniereModification
          state
          __typename
          champs {
            __typename
            ...ChampFragment
            ...RootChampFragment
          }
        }
      }
    }
  }
}
`;
