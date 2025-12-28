import * as React from 'react';
import {useQuery} from '@apollo/react-hooks';
import * as gqlTimeSpan from '../gql/timeSpan';
import * as gqlTag from '../gql/tags';
import {TimeSpan, TimeSpanProps} from './TimeSpan';
import {Tags} from '../gql/__generated__/Tags';
import useInterval from '@rooks/use-interval';
import moment from 'moment';
import {TimeSpans, TimeSpansVariables} from '../gql/__generated__/TimeSpans';
import {Typography, IconButton, Tooltip} from '@material-ui/core';
import {GetApp} from '@material-ui/icons';
import {GroupedTimeSpanProps, toGroupedTimeSpanProps} from './timespanutils';
import {TagSelectorEntry} from '../tag/tagSelectorEntry';
import ReactInfinite from 'react-infinite';
import {isSameDate} from '../utils/time';
import {DailyTrackersList} from '../dailytracker/DailyTrackersList';

interface DoneTrackersProps {
    addTagsToTracker?: (entries: TagSelectorEntry[]) => void;
}

export const DoneTrackers: React.FC<DoneTrackersProps> = ({addTagsToTracker}) => {
    const trackersResult = useQuery<TimeSpans, TimeSpansVariables>(gqlTimeSpan.TimeSpans, {
        variables: {cursor: {pageSize: 30}},
    });
    const loading = React.useRef(false);
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    const [infiniteLoading, setInfiniteLoading] = React.useState(false);
    const [currentDate, setCurrentDate] = React.useState(moment());
    const [heights, setHeights] = React.useState<Record<string, number>>({});
    useInterval(
        () => {
            if (!isSameDate(currentDate, moment())) {
                setCurrentDate(moment());
            }
        },
        1000,
        true
    );

    const fetchMore = () => {
        if (!trackersResult || !trackersResult.data || trackersResult.loading || loading.current) {
            return;
        }
        loading.current = true;
        const {offset, pageSize, startId} = trackersResult.data.timeSpans.cursor;
        trackersResult
            .fetchMore({
                variables: {
                    cursor: {
                        startId,
                        offset,
                        pageSize,
                    },
                },
                updateQuery: (prev, {fetchMoreResult}): TimeSpans => {
                    if (!fetchMoreResult) {
                        return prev;
                    }

                    return {
                        timeSpans: {
                            __typename: 'PagedTimeSpans',
                            timeSpans: [...prev.timeSpans.timeSpans, ...fetchMoreResult.timeSpans.timeSpans],
                            cursor: fetchMoreResult.timeSpans.cursor,
                        },
                    };
                },
            })
            .then(() => {
                loading.current = false;
                return setInfiniteLoading(false);
            })
            .catch(() => {
                loading.current = false;
                return setInfiniteLoading(false);
            });
    };

    const values: GroupedTimeSpanProps = React.useMemo(() => {
        if (
            trackersResult.error ||
            trackersResult.loading ||
            !trackersResult.data ||
            trackersResult.data.timeSpans === null ||
            tagsResult.error ||
            tagsResult.loading ||
            !tagsResult.data ||
            tagsResult.data.tags === null
        ) {
            return [];
        }
        return toGroupedTimeSpanProps(trackersResult.data.timeSpans.timeSpans, tagsResult.data.tags, currentDate);
    }, [trackersResult, tagsResult, currentDate]);

    return (
        <div style={{marginTop: 10}}>
            <ReactInfinite
                key={1}
                useWindowAsScrollContainer
                preloadBatchSize={window.innerHeight}
                onInfiniteLoad={fetchMore}
                isInfiniteLoading={infiniteLoading}
                infiniteLoadBeginEdgeOffset={2000}
                loadingSpinnerDelegate={
                    <Typography align={'center'} variant={'h5'}>
                        .. loading time spans ..
                    </Typography>
                }
                elementHeight={values.map((m) => heights[m.key] || 500)}>
                {values.map(({key, timeSpans}) => {
                    return (
                        <DatedTimeSpans
                            key={key}
                            name={key}
                            timeSpans={timeSpans}
                            addTagsToTracker={addTagsToTracker}
                            setHeight={setHeights}
                            height={heights[key] || 500}
                        />
                    );
                })}
            </ReactInfinite>
        </div>
    );
};

const DatedTimeSpans: React.FC<{
    name: string;
    setHeight: (cb: (height: Record<string, number>) => Record<string, number>) => void;
    height: number;
    timeSpans: TimeSpanProps[];
} & DoneTrackersProps> = ({name, timeSpans, addTagsToTracker, setHeight, height}) => {
    const ref = React.useRef<HTMLDivElement | null>();

    // Parse date from name (format: "Monday, January 1, 2024 (today)")
    const date = React.useMemo(() => {
        const baseName = name.replace(/\s*\((today|yesterday)\)\s*$/, '').trim();
        return moment(baseName, 'dddd, LL');
    }, [name]);

    React.useEffect(() => {
        const currentHeight = ref.current && ref.current.getBoundingClientRect().height;
        if (currentHeight != null && currentHeight !== height) {
            setHeight((old) => ({...old, [name]: currentHeight}));
        }
    }, [ref, name, setHeight, height]);

    const exportToMarkdown = () => {
        // Extract the date from the name (format: "Monday, January 1, 2024 (today)")
        const dateMatch = name.match(/([^,(]+)/);
        const dateStr = dateMatch ? dateMatch[1].trim() : name;

        let markdown = `# ${dateStr}\n\n`;

        // Add daily trackers section
        const trackersData = document.querySelector(`[data-trackers-date="${date.format('YYYY-MM-DD')}"]`);
        if (trackersData) {
            const trackerItems = trackersData.querySelectorAll('[data-tracker-item]');
            if (trackerItems.length > 0) {
                markdown += `## Daily Trackers\n\n`;
                trackerItems.forEach((item) => {
                    const nameEl = item.querySelector('[data-tracker-name]');
                    const valueEl = item.querySelector('[data-tracker-value]');
                    const name = (nameEl && nameEl.textContent) || '';
                    const value = (valueEl && valueEl.textContent) || '';
                    markdown += `- **${name}**: ${value}\n`;
                });
                markdown += `\n`;
            }
        }

        markdown += `\n## Timespans\n\n`;
        [...timeSpans].reverse().forEach((ts) => {
            const tags = ts.initialTags.map((t) => `${t.tag.key}:${t.value}`).join(', ');
            const description = ts.note || '';

            const start = ts.range.from;
            const end = ts.range.to || moment();
            const duration = moment.duration(end.diff(start));
            const durationStr = duration.asMinutes() < 60
                ? `${duration.minutes()}m`
                : `${Math.floor(duration.asHours())}h ${duration.minutes()}m`;
            const startTime = start.format('LT');

            markdown += `${tags}\n${description}\n`;
            markdown += ` - ${durationStr} (${startTime})\n\n`;
        });

        const blob = new Blob([markdown], {type: 'text/markdown'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dateStr.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div key={name} ref={(r) => (ref.current = r)}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                <Typography key={name} align="center" variant={'h5'} style={{margin: 0}}>
                    {name}
                </Typography>
                <Tooltip title="Export to Markdown">
                    <IconButton size="small" onClick={exportToMarkdown}>
                        <GetApp fontSize="small" />
                    </IconButton>
                </Tooltip>
            </div>
            <DailyTrackersList date={date} />
            {timeSpans.map((timeSpanProps) => (
                <TimeSpan key={timeSpanProps.id} {...timeSpanProps} addTagsToTracker={addTagsToTracker} />
            ))}
        </div>
    );
};
