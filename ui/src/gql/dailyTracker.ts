import {gql} from 'apollo-boost';

export const DailyTrackers = gql`
    query DailyTrackers {
        dailyTrackers {
            id
            name
            type
            chainable
            color
            streakDays
            milestoneBadges
        }
    }
`;

export const DailyTrackerValues = gql`
    query DailyTrackerValues($from: String!, $to: String!) {
        dailyTrackerValues(fromInclusive: $from, toInclusive: $to) {
            id
            trackerId
            tracker {
                id
                name
                type
                color
                chainable
            }
            date
            textValue
            numberValue
            boolValue
        }
    }
`;

export const CreateDailyTracker = gql`
    mutation CreateDailyTracker($name: String!, $type: TrackerType!, $chainable: Boolean!, $color: String!) {
        createDailyTracker(name: $name, type: $type, chainable: $chainable, color: $color) {
            id
            name
            type
            chainable
            color
            streakDays
            milestoneBadges
        }
    }
`;

export const UpdateDailyTracker = gql`
    mutation UpdateDailyTracker($id: Int!, $name: String, $type: TrackerType, $chainable: Boolean, $color: String) {
        updateDailyTracker(id: $id, name: $name, type: $type, chainable: $chainable, color: $color) {
            id
            name
            type
            chainable
            color
            streakDays
            milestoneBadges
        }
    }
`;

export const RemoveDailyTracker = gql`
    mutation RemoveDailyTracker($id: Int!) {
        removeDailyTracker(id: $id) {
            id
        }
    }
`;

export const SetDailyTrackerValue = gql`
    mutation SetDailyTrackerValue($trackerId: Int!, $date: String!, $textValue: String, $numberValue: Float, $boolValue: Boolean) {
        setDailyTrackerValue(trackerId: $trackerId, date: $date, textValue: $textValue, numberValue: $numberValue, boolValue: $boolValue) {
            id
            trackerId
            tracker {
                id
                name
                type
                color
                chainable
            }
            date
            textValue
            numberValue
            boolValue
        }
    }
`;

export const RemoveDailyTrackerValue = gql`
    mutation RemoveDailyTrackerValue($id: Int!) {
        removeDailyTrackerValue(id: $id) {
            id
        }
    }
`;
